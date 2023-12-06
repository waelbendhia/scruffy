package status

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const tagsManifestKey = "sharedTagsManifest"

var _ Revalidator = (*RedisRevalidator)(nil)

type RedisRevalidator struct{ *redis.Client }

// RevalidateAlbums implements Revalidator.
func (r *RedisRevalidator) RevalidateAlbums(ctx context.Context) error {
	err := r.Client.HSet(ctx, tagsManifestKey, "artists", time.Now().Format(time.RFC3339)).Err()
	if err != nil {
		return fmt.Errorf("could not set artists tag manifest: %w", err)
	}
	return nil
}

// RevalidateArtists implements Revalidator.
func (r *RedisRevalidator) RevalidateArtists(ctx context.Context) error {
	err := r.Client.HSet(ctx, tagsManifestKey, "albums", time.Now().Format(time.RFC3339)).Err()
	if err != nil {
		return fmt.Errorf("could not set artists tag manifest: %w", err)
	}
	return nil
}
