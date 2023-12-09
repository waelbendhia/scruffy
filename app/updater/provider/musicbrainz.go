package provider

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/waelbendhia/scruffy/app/updater/logging"
	"github.com/waelbendhia/scruffy/app/updater/rate"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
)

var _ AlbumProvider = (*MusicBrainzProvider)(nil)

const userAgent = `scruffy/0.0.0 ( https://scruffy.wbd.tn )`
const musicbrainzBaseURL = "https://musicbrainz.org/ws/2/"
const coverArchiveBaseURL = "https://coverartarchive.org"

type (
	MusicBrainzOption   func(*MusicBrainzProvider)
	MusicBrainzProvider struct {
		disableable
		client *http.Client
		limit  *rate.Limiter
	}
	ArtistCredit struct {
		Artist struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"artist"`
	}
	MusicBrainzRelease struct {
		ID           string         `json:"id"`
		Score        int            `json:"score"`
		Title        string         `json:"title"`
		ArtistCredit []ArtistCredit `json:"artist-credit"`
		Date         string         `json:"date"`
	}
	MusicBrainzSearchResult struct {
		Releases []MusicBrainzRelease `json:"releases"`
	}
)

func (mbp *MusicBrainzProvider) AlbumDisable()      { mbp.disable() }
func (mbp *MusicBrainzProvider) AlbumEnable()       { mbp.enable() }
func (mbp *MusicBrainzProvider) AlbumEnabled() bool { return mbp.enabled() }

func (*MusicBrainzProvider) Name() string { return "musicbrainz" }

func MusicBrainzWithClient(client *http.Client) MusicBrainzOption {
	return func(mbp *MusicBrainzProvider) { mbp.client = client }
}

func MusicBrainzWithRateLimiter(l *rate.Limiter) MusicBrainzOption {
	return func(mbp *MusicBrainzProvider) { mbp.limit = l }
}

func NewMusicBrainzProvider(opts ...MusicBrainzOption) *MusicBrainzProvider {
	mbp := &MusicBrainzProvider{}
	for _, opt := range opts {
		opt(mbp)
	}

	if mbp.client == nil {
		mbp.client = &http.Client{
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		}
	}

	if mbp.limit == nil {
		mbp.limit = rate.NewLimiter(1, time.Second)
	}

	return mbp
}

func (mbr MusicBrainzRelease) year(ctx context.Context) int {
	if mbr.Date == "" {
		return 0
	}

	var err error

	for _, l := range []string{"2006", "2006-01", "2006-01-2"} {
		d, tErr := time.Parse(l, mbr.Date)
		if tErr != nil {
			err = multierr.Combine(err, tErr)
			continue
		}

		return d.Year()
	}

	logging.GetLogger(ctx).With(zap.Error(err)).Warn("could not parse MusicBrainz date")

	return 0
}

func (mbr MusicBrainzRelease) artist() string {
	buf := bytes.NewBuffer(nil)
	for _, a := range mbr.ArtistCredit {
		if buf.Len() != 0 {
			buf.WriteString(", ")
		}
		buf.WriteString(a.Artist.Name)
	}
	return buf.String()
}

func (mb *MusicBrainzProvider) getCover(ctx context.Context, mbid string) string {
	for _, relF := range []string{
		`/release/%s/front-500`,
		`/release/%s/front-250`,
		`/release/%s/front`,
	} {
		relF := relF
		u, err := url.JoinPath(coverArchiveBaseURL, fmt.Sprintf(relF, mbid))
		if err != nil {
			logging.GetLogger(ctx).
				With(zap.Error(err), zap.String("href", fmt.Sprintf(relF, mbid))).
				Warn("could not join paths")
			continue
		}

		resp, err := mb.client.Get(u)
		if err != nil {
			logging.GetLogger(ctx).
				With(zap.Error(err), zap.String("url", u)).
				Warn("could not get MusicBrainz image")
			continue
		}

		defer resp.Body.Close()

		if resp.StatusCode != http.StatusTemporaryRedirect {
			logging.GetLogger(ctx).
				With(zap.Int("status-code", resp.StatusCode)).
				Warn("unexpected status code from coverartarchive")
			continue
		}

		if loc := resp.Header.Get("location"); loc != "" {
			return loc
		}
	}

	return ""
}

// SearchAlbums implements AlbumProvider.
func (mb *MusicBrainzProvider) SearchAlbums(
	ctx context.Context, artist string, album string,
) ([]AlbumResult, error) {
	if !mb.enabled() {
		return nil, ErrDisabled
	}

	req, err := http.NewRequestWithContext(
		ctx, "GET", "https://musicbrainz.org/ws/2/release", nil,
	)
	if err != nil {
		return nil, fmt.Errorf("could not create search request: %w", err)
	}

	q := req.URL.Query()
	q.Add("fmt", "json")
	q.Add("query", fmt.Sprintf("release:%s AND artist:%s", album, artist))
	req.URL.RawQuery = q.Encode()

	if err := mb.limit.Do(ctx); err != nil {
		return nil, err
	}

	resp, err := mb.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	sr, err := readRespJSON[MusicBrainzSearchResult](resp)
	if err != nil {
		return nil, err
	}

	type ixedResult struct {
		i int
		AlbumResult
	}
	ch := make(chan ixedResult, len(sr.Releases))

	g, ctx := errgroup.WithContext(ctx)
	for i, rel := range sr.Releases {
		i, rel := i, rel
		g.Go(func() error {
			res := AlbumResult{
				ID:          rel.ID,
				ArtistName:  rel.artist(),
				Name:        rel.Title,
				ReleaseYear: rel.year(ctx),
				Confidence:  rel.Score,
			}
			if rel.Score >= 80 {
				res.CoverURL = mb.getCover(ctx, rel.ID)
			}

			ch <- ixedResult{i: i, AlbumResult: res}
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("failed to get cover: %w", err)
	}

	close(ch)

	rels := make([]AlbumResult, len(sr.Releases), len(sr.Releases))
	for rel := range ch {
		rels[rel.i] = rel.AlbumResult
	}

	return rels, nil
}
