package provider

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/waelbendhia/scruffy/app/updater/rate"
)

var _ interface {
	AlbumProvider
	ArtistProvider
} = (*DeezerProvider)(nil)

type (
	DeezerOption   func(*DeezerProvider)
	DeezerProvider struct {
		disableable
		client *http.Client
		limit  *rate.Limiter
	}
	DeezerSearchResult[T any] struct {
		Data  []T `json:"data"`
		Total int `json:"total"`
	}
	DeezerArtist struct {
		ID            int    `json:"id"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
		PictureSmall  string `json:"picture_small"`
		PictureMedium string `json:"picture_medium"`
		PictureBig    string `json:"picture_big"`
		PictureXL     string `json:"picture_XL"`
	}
	DeezerAlbum struct {
		ID          int          `json:"id"`
		Title       string       `json:"title"`
		Cover       string       `json:"cover"`
		CoverSmall  string       `json:"cover_small"`
		CoverMedium string       `json:"cover_medium"`
		CoverBig    string       `json:"cover_big"`
		CoverXL     string       `json:"cover_XL"`
		Artist      DeezerArtist `json:"artist"`
	}
)

func (*DeezerProvider) Name() string { return "deezer" }

func DeezerWithClient(client *http.Client) DeezerOption {
	return func(mbp *DeezerProvider) { mbp.client = client }
}

func DeezerWithRateLimiter(l *rate.Limiter) DeezerOption {
	return func(mbp *DeezerProvider) { mbp.limit = l }
}

func NewDeezerProvider(opts ...DeezerOption) *DeezerProvider {
	dp := &DeezerProvider{}
	dp.Enable()

	for _, opt := range opts {
		opt(dp)
	}

	if dp.client == nil {
		dp.client = &http.Client{}
	}

	if dp.limit == nil {
		dp.limit = rate.NewLimiter(50, 5*time.Second)
	}

	return dp
}

func (sa *DeezerAlbum) cover() string {
	for _, cover := range []string{sa.CoverXL, sa.CoverBig, sa.CoverMedium, sa.CoverSmall} {
		if cover != "" {
			return cover
		}
	}
	return sa.Cover
}

var defaultImages = map[string]struct{}{
	"https://e-cdns-images.dzcdn.net/images/artist//1000x1000-000000-80-0-0.jpg": {},
	"https://e-cdns-images.dzcdn.net/images/artist//500x500-000000-80-0-0.jpg":   {},
	"https://e-cdns-images.dzcdn.net/images/artist//250x250-000000-80-0-0.jpg":   {},
	"https://e-cdns-images.dzcdn.net/images/artist//56x56-000000-80-0-0.jpg":     {},
}

func (sa *DeezerArtist) image() string {
	for _, cover := range []string{
		sa.PictureXL, sa.PictureBig, sa.PictureMedium, sa.PictureSmall,
	} {
		if _, isDefaultImage := defaultImages[cover]; cover != "" && !isDefaultImage {
			return cover
		}
	}
	return sa.Picture
}

func (sp *DeezerProvider) doRequest(
	ctx context.Context, req *http.Request,
) (*http.Response, error) {
	if err := sp.limit.Do(ctx); err != nil {
		return nil, err
	}

	return sp.client.Do(req)
}

// SearchAlbums implements AlbumProvider.
func (sp *DeezerProvider) SearchAlbums(
	ctx context.Context, artist string, album string,
) ([]AlbumResult, error) {
	if !sp.Enabled() {
		return nil, ErrDisabled
	}

	req, err := http.NewRequestWithContext(
		ctx, "GET", "https://api.deezer.com/search/album", nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	q := req.URL.Query()
	q.Add("q", fmt.Sprintf("artist:\"%s\"album:\"%s\"", artist, album))
	req.URL.RawQuery = q.Encode()

	resp, err := sp.doRequest(ctx, req)
	if err != nil {
		return nil, err
	}

	res, err := readRespJSON[DeezerSearchResult[DeezerAlbum]](resp)
	if err != nil {
		return nil, err
	}

	as := make([]AlbumResult, 0, len(res.Data))
	for i, a := range res.Data {
		as = append(as, AlbumResult{
			ID:          strconv.Itoa(a.ID),
			ArtistName:  a.Artist.Name,
			Name:        a.Title,
			ReleaseYear: 0,
			CoverURL:    a.cover(),
			Confidence:  max(100-i, 0),
		})
	}

	return as, nil
}

// SearchArtists implements ArtistProvider.
func (sp *DeezerProvider) SearchArtists(
	ctx context.Context, artist string,
) ([]ArtistResult, error) {
	if !sp.Enabled() {
		return nil, ErrDisabled
	}

	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.deezer.com/search/artist", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	q := req.URL.Query()
	q.Add("q", fmt.Sprintf("artist:\"%s\"", artist))
	req.URL.RawQuery = q.Encode()

	resp, err := sp.doRequest(ctx, req)
	if err != nil {
		return nil, err
	}

	res, err := readRespJSON[DeezerSearchResult[DeezerArtist]](resp)
	if err != nil {
		return nil, err
	}

	as := make([]ArtistResult, 0, len(res.Data))
	for _, a := range res.Data {
		as = append(as, ArtistResult{
			ID:         strconv.Itoa(a.ID),
			Name:       a.Name,
			ImageURL:   a.image(),
			Confidence: 100,
		})
	}

	return as, nil
}
