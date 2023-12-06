package provider

import "context"

type (
	ArtistResult struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		ImageURL   string `json:"imageURL"`
		Confidence int    `json:"confidence"`
	}
	ArtistProvider interface {
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
		SearchAlbums(ctx context.Context, artist, album string) ([]AlbumResult, error)
	}
)
