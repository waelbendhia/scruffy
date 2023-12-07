package provider

import "context"

type (
	Provider interface {
		Name() string
		Enabled() bool
		Disable()
		Enable()
	}
	ArtistProvider interface {
		Provider
		SearchArtists(context.Context, string) ([]ArtistResult, error)
	}
	AlbumProvider interface {
		Provider
		SearchAlbums(ctx context.Context, artist, album string) ([]AlbumResult, error)
	}
)
