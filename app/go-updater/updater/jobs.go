package updater

import (
	"context"
	"errors"

	"github.com/waelbendhia/scruffy/app/go-updater/logging"
	"github.com/waelbendhia/scruffy/app/go-updater/scraper"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
)

type (
	pageReadJob[T any] struct {
		page   *scraper.ScruffyPage
		path   string
		reader T
	}
	artistsPageReadJob = pageReadJob[scraper.PageReader]
	artistPageReadJob  = pageReadJob[scraper.ArtistPageReader]
	ratingsPageReadJob = pageReadJob[scraper.CDReviewReader]
)

func filterPageReadJobs[T any](
	ctx context.Context,
	u *Updater,
	in <-chan pageReadJob[T],
	filterUnchanged bool,
) <-chan pageReadJob[T] {
	out := make(chan pageReadJob[T], u.concurrency)

	go func() {
		defer close(out)
		for job := range in {
			ctx := logging.AddField(ctx, zap.String("page-path", job.path))
			log := logging.GetLogger(ctx)
			err := u.upsertPage(ctx, job.path, job.page)
			if errors.Is(err, ErrPageUnchanged) {
				if filterUnchanged {
					log.With(zap.Error(err)).Warn("skipping")
					continue
				}
			} else if err != nil {
				u.error(ctx, err, "could not upsert UpdateHistory")
				continue
			}

			select {
			case out <- job:
				u.pageHook(job.page)
			case <-ctx.Done():
				return
			}
		}
	}()

	return out
}

func (u *Updater) runArtistReadJobs(
	ctx context.Context, in <-chan artistPageReadJob,
) (<-chan scraper.Artist, <-chan scraper.Album) {
	outArtists := make(chan scraper.Artist, u.concurrency)
	outAlbums := make(chan scraper.Album, u.concurrency)

	u.doConcurrently(ctx, func() { close(outArtists); close(outAlbums) }, func() error {
		for job := range in {
			ctx := logging.AddField(ctx, zap.String("page-path", job.path))
			res, err := job.reader(ctx, job.path, job.page.Doc)
			if err != nil {
				u.error(ctx, err, "could not read page")
				continue
			}

			select {
			case outArtists <- *res:
			case <-ctx.Done():
				return nil
			}

			for _, album := range res.Albums {
				album := album
				select {
				case outAlbums <- album:
				case <-ctx.Done():
					return nil
				}
			}

		}

		return nil
	})

	return outArtists, outAlbums
}

func (u *Updater) runArtistPageReadJobs(ctx context.Context, in <-chan artistsPageReadJob) <-chan string {
	out := make(chan string, u.concurrency)

	u.doConcurrently(ctx, func() { close(out) }, func() error {
		for job := range in {
			ctx := logging.AddField(ctx, zap.String("page-path", job.path))
			res, err := job.reader(ctx, job.page.Doc)
			if err != nil {
				u.error(ctx, err, "could not read page")
				continue
			}

			for a := range res {
				select {
				case out <- a:
				case <-ctx.Done():
					return nil
				}

			}
		}

		return nil
	})

	return out
}

func (u *Updater) runRatingsPageReadJobs(
	ctx context.Context, in <-chan ratingsPageReadJob,
) (<-chan string, <-chan scraper.Album) {
	outArtist := make(chan string, u.concurrency)
	outAlbum := make(chan scraper.Album, u.concurrency)

	u.doConcurrently(ctx, func() { close(outAlbum); close(outArtist) }, func() error {
		for job := range in {
			ctx := logging.AddField(ctx, zap.String("page-path", job.path))
			res, err := job.reader(ctx, job.page.Doc)
			if err != nil {
				u.error(ctx, err, "could not read page")
				continue
			}

			as := map[string]struct{}{}

			g, ctx := errgroup.WithContext(ctx)

			g.Go(func() error {
				for _, a := range res {
					as[a.ArtistURL] = struct{}{}
					select {
					case outAlbum <- a:
					case <-ctx.Done():
						return nil
					}
				}

				for a := range as {
					select {
					case outArtist <- a:
					case <-ctx.Done():
						return nil
					}
				}
				return nil
			})

			g.Wait()
		}

		return nil
	})

	return outArtist, outAlbum
}
