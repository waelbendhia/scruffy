package updater

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/waelbendhia/scruffy/app/updater/database"
	"github.com/waelbendhia/scruffy/app/updater/logging"
	"github.com/waelbendhia/scruffy/app/updater/provider"
	"github.com/waelbendhia/scruffy/app/updater/scraper"
	"go.uber.org/zap"
	"golang.org/x/exp/constraints"
	"golang.org/x/sync/errgroup"
)

type AlbumWithImage struct {
	CoverURL string
	scraper.Album
}

func selectNonEmpty[T comparable](ts ...T) T {
	var empty T
	for _, s := range ts {
		if s != empty {
			return s
		}
	}
	return empty
}

func nonEmptyMin[T constraints.Ordered](ts ...T) T {
	var empty, res T
	for _, s := range ts {
		if res == empty || s < res {
			res = s
		}
	}

	return res
}

func (u *Updater) getAlbumImageAndYear(ctx context.Context, artist, album string) (string, int) {
	// TODO: make deadlline configuraable
	ctx, cancel := context.WithTimeout(ctx, time.Second*10)
	defer cancel()
	g, ctx := errgroup.WithContext(ctx)

	out := make(chan provider.AlbumResult, len(u.albumProviders))

	for name, provider := range u.albumProviders {
		name, provider := name, provider
		if !provider.provider.AlbumEnabled() {
			logging.GetLogger(ctx).With(zap.String("provider", name)).
				Debug("skipping provider")
			continue
		}

		g.Go(func() error {
			ctx := logging.AddField(ctx, zap.String("provider", name))
			as, err := provider.provider.SearchAlbums(ctx, artist, album)
			if err != nil {
				u.error(ctx, err, "could not search albums")
				return nil
			}

			for _, a := range as {
				a.Confidence *= provider.weight
				select {
				case out <- a:
				case <-ctx.Done():
					return nil
				}
			}

			return nil
		})
	}

	go func() { defer close(out); g.Wait() }()

	bestCover := ""
	bestYear := 0
	bestScore := 0

	for a := range out {
		if a.Confidence > bestScore || bestCover == "" {
			bestCover = selectNonEmpty(bestCover, a.CoverURL)
			bestYear = nonEmptyMin(bestYear, a.ReleaseYear)
			bestScore = a.Confidence
		}
	}

	return bestCover, bestYear
}

func (u *Updater) addAlbumCover(ctx context.Context, in <-chan scraper.Album) <-chan AlbumWithImage {
	g, ctx := errgroup.WithContext(ctx)
	out := make(chan AlbumWithImage, u.concurrency)

	for i := 0; i < u.concurrency; i++ {
		g.Go(func() error {
			for a := range in {
				cover, year := u.getAlbumImageAndYear(ctx, a.ArtistName, a.Name)
				a.Year = selectNonEmpty(a.Year, year)
				logging.GetLogger(ctx).
					With(zap.Any("album", AlbumWithImage{
						Album:    a,
						CoverURL: cover,
					})).
					Debug("got cover and year")
				select {
				case out <- AlbumWithImage{Album: a, CoverURL: cover}:
				case <-ctx.Done():
					return nil
				}
			}

			return nil
		})
	}

	go func() { defer close(out); g.Wait() }()

	return out
}

func (u *Updater) ProcessAlbums(
	ctx context.Context, filterUnchanged bool, ins ...<-chan scraper.Album,
) <-chan AlbumWithImage {
	deduplicated := deduplicateWith[scraper.Album](
		ctx,
		u.concurrency,
		func(a scraper.Album) string {
			return fmt.Sprintf("%s - %s", a.ArtistURL, a.Name)
		},
		func(a, b scraper.Album) scraper.Album {
			if a.ArtistURL == a.PageURL {
				return a
			}
			return b
		},
		ins...,
	)
	return u.addAlbumCover(ctx, deduplicated)
}

func (u *Updater) InsertAlbums(
	ctx context.Context, in <-chan AlbumWithImage,
) <-chan AlbumWithImage {
	out := make(chan AlbumWithImage, u.concurrency)
	q := database.New(u.db)
	go func() {
		defer close(out)
		for a := range in {
			ctx := logging.AddField(
				ctx,
				zap.String("artist-url", a.ArtistURL),
				zap.String("album", a.Name),
			)
			if err := q.UpsertAlbum(ctx, database.UpsertAlbumParams{
				Name: a.Name,
				Year: sql.NullInt64{
					Valid: a.Year != 0,
					Int64: int64(a.Year),
				},
				Rating:    a.Rating,
				ArtistUrl: a.ArtistURL,
				ImageUrl: sql.NullString{
					Valid:  a.CoverURL != "",
					String: a.CoverURL,
				},
				PageURL: a.PageURL,
			}); err != nil {
				u.error(ctx, err, "could not upsert album")
				continue
			}
			select {
			case out <- a:
			case <-ctx.Done():
				return
			}
		}
	}()
	return out
}
