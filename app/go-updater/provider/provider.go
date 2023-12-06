package provider

import "context"

type (
	Provider interface {
		Name() string
		Enabled() bool
		Disable()
		Enable()
	}
	ArtistResult struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		ImageURL   string `json:"imageURL"`
		Confidence int    `json:"confidence"`
	}
	ArtistProvider interface {
		Provider
		SearchArtists(context.Context, string) ([]ArtistResult, error)
	}

	AlbumResult struct {
		ID          string `json:"id"`
		ArtistName  string `json:"artistName"`
		Name        string `json:"name"`
		CoverURL    string `json:"coverURL"`
		ReleaseYear int    `json:"releaseYear"`
		Confidence  int    `json:"confidence"`
	}
	AlbumProvider interface {
		Provider
		SearchAlbums(ctx context.Context, artist, album string) ([]AlbumResult, error)
	}
)
