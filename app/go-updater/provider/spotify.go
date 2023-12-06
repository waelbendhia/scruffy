package provider

import (
	"bytes"
	"cmp"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"slices"
	"strconv"
	"sync"
	"time"

	"github.com/waelbendhia/scruffy/app/go-updater/logging"
	"github.com/waelbendhia/scruffy/app/go-updater/rate"
	"go.uber.org/zap"
	"golang.org/x/oauth2/clientcredentials"
)

var _ interface {
	AlbumProvider
	ArtistProvider
} = (*SpotifyProvider)(nil)

type (
	SpotifyOption   func(*SpotifyProvider)
	SpotifyProvider struct {
		disableable
		client       *http.Client
		limit        *rate.Limiter
		limitReached bool
		cond         *sync.Cond
	}
	SpotifyAlbumArtist struct {
		HREF string `json:"href"`
		ID   string `json:"id"`
		Name string `json:"name"`
		URI  string `json:"uni"`
	}
	SpotifyImage struct {
		Height int    `json:"height"`
		Width  int    `json:"width"`
		URL    string `json:"url"`
	}
	SpotifyAlbum struct {
		Artists              []SpotifyAlbumArtist `json:"artists"`
		Genres               []string             `json:"genres"`
		HREF                 string               `json:"href"`
		ID                   string               `json:"id"`
		Images               []SpotifyImage       `json:"images"`
		Name                 string               `json:"name"`
		ReleaseDate          string               `json:"release_date"`
		ReleaseDatePrecision string               `json:"release_date_precision"`
		URI                  string               `json:"uni"`
	}
	SpotifySearchSubResult[T any] struct {
		Items []T `json:"items"`
	}
	SpotifyAlbumSearchResult struct {
		Albums SpotifySearchSubResult[SpotifyAlbum] `json:"albums"`
	}
	SpotifyArtist struct {
		Genres []string       `json:"genres"`
		HREF   string         `json:"href"`
		ID     string         `json:"id"`
		Images []SpotifyImage `json:"images"`
		Name   string         `json:"name"`
		URI    string         `json:"uni"`
	}
	SpotifyArtistSearchResult struct {
		Artists SpotifySearchSubResult[SpotifyArtist] `json:"artists"`
	}
)

func (*SpotifyProvider) Name() string { return "spotify" }

func SpotifyWithClient(client *http.Client) SpotifyOption {
	return func(mbp *SpotifyProvider) { mbp.client = client }
}

func SpotifyWithRateLimiter(l *rate.Limiter) SpotifyOption {
	return func(mbp *SpotifyProvider) { mbp.limit = l }
}

func NewSpotifyProvider(ctx context.Context, opts ...SpotifyOption) *SpotifyProvider {
	sp := &SpotifyProvider{cond: sync.NewCond(&sync.Mutex{})}
	sp.Enable()
	for _, opt := range opts {
		opt(sp)
	}

	if sp.client == nil {
		creds := clientcredentials.Config{
			ClientID:     os.Getenv("SPOTIFY_CLIENT_ID"),
			ClientSecret: os.Getenv("SPOTIFY_CLIENT_SECRET"),
			TokenURL:     "https://accounts.spotify.com/api/token",
		}
		sp.client = creds.Client(ctx)
	}

	if sp.limit == nil {
		sp.limit = rate.NewLimiter(240, 30*time.Second)
	}

	return sp
}

func (sa *SpotifyAlbum) year() int {
	var layout string
	switch sa.ReleaseDatePrecision {
	case "year":
		layout = "2006"
	case "month":
		layout = "2006-01"
	case "day":
		layout = "2006-01-02"
	default:
		return 0
	}

	t, err := time.Parse(layout, sa.ReleaseDate)
	if err != nil {
		return 0
	}

	return t.Year()
}

func (sa *SpotifyAlbum) artist() string {
	buf := bytes.NewBuffer(nil)
	for _, a := range sa.Artists {
		if buf.Len() != 0 {
			buf.WriteString(", ")
		}
		buf.WriteString(a.Name)
	}
	return buf.String()
}

func (sa *SpotifyAlbum) cover() string {
	if len(sa.Images) == 0 {
		return ""
	}

	max := slices.MaxFunc(sa.Images, func(a, b SpotifyImage) int {
		return cmp.Compare(a.Width*a.Height, b.Width*b.Height)
	})
	return max.URL
}

func (sa *SpotifyArtist) image() string {
	if len(sa.Images) == 0 {
		return ""
	}

	max := slices.MaxFunc(sa.Images, func(a, b SpotifyImage) int {
		return cmp.Compare(a.Width*a.Height, b.Width*b.Height)
	})
	return max.URL
}

func (sp *SpotifyProvider) setDelay(delay time.Duration) {
	delayCh := time.After(delay)
	sp.cond.L.Lock()
	defer sp.cond.L.Unlock()
	sp.limitReached = true
	sp.cond.Broadcast()
	go func() {
		<-delayCh
		sp.cond.L.Lock()
		defer sp.cond.L.Unlock()
		sp.limitReached = false
		sp.cond.Broadcast()
	}()
}

func (sp *SpotifyProvider) waitDelay(ctx context.Context) error {
	ch := make(chan struct{}, 1)

	go func() {
		sp.cond.L.Lock()
		for sp.limitReached {
			sp.cond.Wait()
		}
		sp.cond.L.Unlock()
		ch <- struct{}{}
		close(ch)
	}()

	select {
	case <-ch:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (sp *SpotifyProvider) waitMyTurn(ctx context.Context) error {
	limitCh := make(chan error, 1)
	delayCh := make(chan error, 1)
	go func() { limitCh <- sp.limit.Do(ctx); close(limitCh) }()
	go func() { delayCh <- sp.waitDelay(ctx); close(delayCh) }()

	if err := <-limitCh; err != nil {
		return err
	}
	return <-delayCh

}

func (sp *SpotifyProvider) doRequest(
	ctx context.Context, req *http.Request,
) (*http.Response, error) {
	if err := sp.waitMyTurn(ctx); err != nil {
		return nil, err
	}

	resp, err := sp.client.Do(req)
	if err != nil {
		return resp, fmt.Errorf("failed to do request: %w", err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		defer resp.Body.Close()
		retryAfter := resp.Header.Get("retry-after")

		logging.GetLogger(ctx).With(zap.String("retry-after", retryAfter)).
			Debug("got a 429 from spotify")

		retryDelay, err := strconv.Atoi(retryAfter)
		if err != nil {
			return nil, fmt.Errorf("could not parse retry-after header: %w", err)
		}

		log.Println(retryAfter, time.Second*time.Duration(retryDelay))

		sp.setDelay(time.Second * time.Duration(retryDelay))
		return sp.doRequest(ctx, req)
	}

	return resp, err
}

// SearchAlbums implements AlbumProvider.
func (sp *SpotifyProvider) SearchAlbums(
	ctx context.Context, artist string, album string,
) ([]AlbumResult, error) {
	if !sp.Enabled() {
		return nil, ErrDisabled
	}

	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.spotify.com/v1/search", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	q := req.URL.Query()
	q.Add("q", fmt.Sprintf("artist:%s album:%s", artist, album))
	q.Add("type", "album")
	req.URL.RawQuery = q.Encode()

	resp, err := sp.doRequest(ctx, req)
	if err != nil {
		return nil, err
	}

	res, err := readRespJSON[SpotifyAlbumSearchResult](resp)
	if err != nil {
		return nil, err
	}

	as := make([]AlbumResult, 0, len(res.Albums.Items))
	for i, a := range res.Albums.Items {
		as = append(as, AlbumResult{
			ID:          a.ID,
			ArtistName:  a.artist(),
			Name:        a.Name,
			ReleaseYear: a.year(),
			CoverURL:    a.cover(),
			Confidence:  max(0, 100-i),
		})
	}

	return as, nil
}

// SearchArtists implements ArtistProvider.
func (sp *SpotifyProvider) SearchArtists(
	ctx context.Context, artist string,
) ([]ArtistResult, error) {
	if !sp.Enabled() {
		return nil, ErrDisabled
	}

	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.spotify.com/v1/search", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	q := req.URL.Query()
	q.Add("q", fmt.Sprintf("artist:%s", artist))
	q.Add("type", "artist")
	req.URL.RawQuery = q.Encode()

	resp, err := sp.doRequest(ctx, req)
	if err != nil {
		return nil, err
	}

	res, err := readRespJSON[SpotifyArtistSearchResult](resp)
	if err != nil {
		return nil, err
	}

	as := make([]ArtistResult, 0, len(res.Artists.Items))
	for i, a := range res.Artists.Items {
		as = append(as, ArtistResult{
			ID:         a.ID,
			Name:       a.Name,
			ImageURL:   a.image(),
			Confidence: max(0, 100-i),
		})
	}

	return as, nil
}
