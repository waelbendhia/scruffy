package provider

import (
	"context"
)

var _ AlbumProvider = (*LastFMProvider)(nil)

type LastFMProvider struct{}

func (lfmp *LastFMProvider) AlbumDisable()      {}
func (lfmp *LastFMProvider) AlbumEnable()       {}
func (lfmp *LastFMProvider) AlbumEnabled() bool { return false }

func (*LastFMProvider) Name() string { return "lastfm" }

// SearchAlbums implements AlbumProvider.
func (mb *LastFMProvider) SearchAlbums(
	ctx context.Context, artist string, album string,
) ([]AlbumResult, error) {
	return nil, ErrDisabled
}
