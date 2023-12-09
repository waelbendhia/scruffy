package updater

import (
	"context"
	"database/sql"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/waelbendhia/scruffy/app/updater/database"
	"github.com/waelbendhia/scruffy/app/updater/logging"
	"github.com/waelbendhia/scruffy/app/updater/provider"
	"github.com/waelbendhia/scruffy/app/updater/scraper"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
)

type ArtistWithImage struct {
	ImageURL string
	scraper.Artist
}

func (u *Updater) addArtistImage(
	ctx context.Context, in <-chan scraper.Artist,
) <-chan ArtistWithImage {
	g, ctx := errgroup.WithContext(ctx)
	out := make(chan ArtistWithImage, u.concurrency)

	for i := 0; i < u.concurrency; i++ {
		g.Go(func() error {
			for a := range in {
				cover := u.getArtistImage(ctx, a.Name)
				select {
				case out <- ArtistWithImage{Artist: a, ImageURL: cover}:
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

func (u *Updater) getArtistImage(ctx context.Context, artist string) string {
	// TODO: make deadline configuraable
	ctx, cancel := context.WithTimeout(ctx, time.Second*10)
	defer cancel()
	g, ctx := errgroup.WithContext(ctx)

	out := make(chan provider.ArtistResult, len(u.artistProviders))

	for name, provider := range u.artistProviders {
		name, provider := name, provider
		if !provider.provider.ArtistEnabled() {
			continue
		}

		g.Go(func() error {
			ctx := logging.AddField(ctx, zap.String("provider", name))
			as, err := provider.provider.SearchArtists(ctx, artist)
			if err != nil {
				u.error(ctx, err, "could not search artists")
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
	bestScore := 0

	for a := range out {
		if a.Confidence > bestScore || bestCover == "" {
			bestCover = a.ImageURL
			bestScore = a.Confidence
		}
	}

	return bestCover
}

func (u *Updater) ProcessArtists(
	ctx context.Context, filterUnchanged bool, ins ...<-chan string,
) (<-chan ArtistWithImage, <-chan scraper.Album) {
	jobs := u.readArtistPages(
		ctx,
		deduplicateOn(ctx, u.concurrency, func(t string) string { return t }, ins...),
	)
	filteredJobs := filterPageReadJobs[scraper.ArtistPageReader](ctx, u, jobs, filterUnchanged)
	artists, albums := u.runArtistReadJobs(ctx, filteredJobs)
	return u.addArtistImage(ctx, artists), albums
}

func validateString(s string) sql.NullString {
	switch {
	case s == "":
		return sql.NullString{Valid: false}
	case utf8.ValidString(s):
		return sql.NullString{Valid: true, String: s}
	default:
		return sql.NullString{Valid: true, String: strings.ToValidUTF8(s, "")}
	}
}

func (u *Updater) InsertArtists(
	ctx context.Context, in <-chan ArtistWithImage,
) <-chan ArtistWithImage {
	out := make(chan ArtistWithImage, u.concurrency)
	q := database.New(u.db)
	go func() {
		defer close(out)
		for a := range in {
			ctx := logging.AddField(ctx, zap.String("artist", a.URL))
			if err := q.UpsertArtist(ctx, database.UpsertArtistParams{
				Url:  a.URL,
				Name: a.Name,
				Bio:  validateString(a.Bio),
				ImageUrl: sql.NullString{
					Valid:  a.ImageURL != "",
					String: a.ImageURL,
				},
			}); err != nil {
				u.error(ctx, err, "could not upsert artist")
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
