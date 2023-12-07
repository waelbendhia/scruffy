package status

import "context"

var _ Revalidator = NoopRevalidator{}

type NoopRevalidator struct{}

func (NoopRevalidator) RevalidateAlbums(context.Context) error {
	return nil
}

func (NoopRevalidator) RevalidateArtists(context.Context) error {
	return nil
}
