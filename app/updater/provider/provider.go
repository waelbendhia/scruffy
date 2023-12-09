package provider

import "context"

type (
	Provider interface {
		Name() string
	}
	ArtistProvider interface {
		Provider
		SearchArtists(context.Context, string) ([]ArtistResult, error)
		ArtistEnabled() bool
		ArtistDisable()
		ArtistEnable()
	}
	AlbumProvider interface {
		Provider
		SearchAlbums(ctx context.Context, artist, album string) ([]AlbumResult, error)
		AlbumEnabled() bool
		AlbumDisable()
		AlbumEnable()
	}
)
