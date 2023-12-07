package updater

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/waelbendhia/scruffy/app/updater/database"
	"github.com/waelbendhia/scruffy/app/updater/logging"
	"github.com/waelbendhia/scruffy/app/updater/scraper"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
)

const basePath = "https://scaruffi.com"

func (u *Updater) error(ctx context.Context, err error, message string) {
	if errors.Is(err, context.Canceled) || err == nil {
		return
	}
	log := logging.GetLogger(ctx)
	log.With(zap.Error(err)).Error("could not read page")
	if u.errorHook != nil {
		u.errorHook(err)
	}
}

func (u *Updater) doRequest(ctx context.Context, req *http.Request) (*http.Response, error) {
	if err := u.limiter.Do(ctx); err != nil {
		return nil, err
	}
	return u.client.Do(req)
}

var (
	ErrPageNotFound  = errors.New("page not found")
	ErrPageUnchanged = errors.New("page has not changed since last update")
)

func (u *Updater) getPage(ctx context.Context, pagePath string) (*scraper.ScruffyPage, error) {
	url, err := url.JoinPath(basePath, pagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create url: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := u.doRequest(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to do request: %w", err)
	}

	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusNotFound:
		return nil, ErrPageNotFound
	case resp.StatusCode < http.StatusOK || resp.StatusCode > http.StatusMultipleChoices:
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf(
			"request failed with status %d and body '%s'",
			resp.StatusCode, string(body),
		)
	}

	page, err := scraper.ReadPage(ctx, resp)
	if err != nil {
		return nil, fmt.Errorf("failed to read page: %w", err)
	}

	return page, nil
}

func (u *Updater) upsertPage(
	ctx context.Context, pagePath string, page *scraper.ScruffyPage,
) error {
	params := database.UpsertUpdateHistoryParams{
		CheckedOn: time.Now(),
		Hash:      page.Hash,
		PageURL:   pagePath,
	}
	_, err := database.New(u.db).UpsertUpdateHistory(ctx, params)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		return ErrPageUnchanged
	case err != nil:
		return fmt.Errorf("failed to read page '%s': %w", pagePath, err)
	default:
		return nil
	}
}

func (u *Updater) readAllArtistsPages(ctx context.Context) <-chan artistsPageReadJob {
	g, ctx := errgroup.WithContext(ctx)

	rs := map[string]scraper.PageReader{
		"/music/groups.html":  scraper.ReadArtistsFromRockPage,
		"/jazz/musician.html": scraper.ReadArtistsFromJazzPage,
		"/vol1/":              scraper.ReadArtistsFromVolumePage(1),
		"/vol2/":              scraper.ReadArtistsFromVolumePage(2),
		"/vol3/":              scraper.ReadArtistsFromVolumePage(3),
		"/vol4/":              scraper.ReadArtistsFromVolumePage(4),
		"/vol5/":              scraper.ReadArtistsFromVolumePage(5),
		"/vol6/":              scraper.ReadArtistsFromVolumePage(6),
		"/vol7/":              scraper.ReadArtistsFromVolumePage(7),
		"/vol8/":              scraper.ReadArtistsFromVolumePage(8),
	}

	out := make(chan artistsPageReadJob, u.concurrency)

	for p, r := range rs {
		p, r := p, r
		g.Go(func() error {
			log := logging.GetLogger(ctx)
			log = log.With(zap.String("page", p))
			page, err := u.getPage(ctx, p)
			if err != nil {
				if !errors.Is(err, context.Canceled) {
					log.With(zap.Error(err)).Warn("failed to get page")
				}
				return nil
			}

			select {
			case out <- artistsPageReadJob{page: page, path: p, reader: r}:
			case <-ctx.Done():
			}

			return nil
		})
	}

	go func() { defer close(out); g.Wait() }()

	return out
}

func (u *Updater) readAlbumPages(ctx context.Context) <-chan ratingsPageReadJob {
	rs := map[string]scraper.CDReviewReader{
		"/cdreview/new.html": scraper.ReadNewRatingsPage(),
	}

	for y := 1990; y <= time.Now().Year(); y++ {
		y := y
		if y < 2000 {
			rs[fmt.Sprintf("/cdreview/%d.html", y)] = scraper.Read90sCDReviewPage(y)
		} else {
			rs[fmt.Sprintf("/cdreview/%d.html", y)] = scraper.Read2000sCDReviewPage(y)
		}
	}

	out := make(chan ratingsPageReadJob, u.concurrency)

	g, ctx := errgroup.WithContext(ctx)
	for p, r := range rs {
		p, r := p, r
		g.Go(func() error {
			log := logging.GetLogger(ctx)
			log = log.With(zap.String("page", p))
			page, err := u.getPage(ctx, p)
			if err != nil {
				if !errors.Is(err, context.Canceled) {
					log.With(zap.Error(err)).Error("failed to get page")
				}
				return nil
			}

			select {
			case out <- ratingsPageReadJob{page: page, path: p, reader: r}:
			case <-ctx.Done():
			}

			return nil
		})
	}

	go func() { defer close(out); g.Wait() }()

	return out
}

func (u *Updater) doConcurrently(ctx context.Context, onFinish func(), f func() error) {
	g, ctx := errgroup.WithContext(ctx)
	for i := 0; i < u.concurrency; i++ {
		g.Go(f)
	}
	go func() { defer onFinish(); g.Wait() }()
}

func (u *Updater) GetAllArtistsAndRatings(
	ctx context.Context, filterUnchanged bool,
) (<-chan string, <-chan scraper.Album) {
	albumJobs := u.readAlbumPages(ctx)
	artistJobs := u.readAllArtistsPages(ctx)

	filteredAlbumJobs := filterPageReadJobs(ctx, u, albumJobs, filterUnchanged)
	filteredArtistJobs := filterPageReadJobs(ctx, u, artistJobs, filterUnchanged)

	artistsFromRatingsPage, albumsFromRatingsPage := u.runRatingsPageReadJobs(ctx, filteredAlbumJobs)

	artists := deduplicateOn(
		ctx,
		u.concurrency,
		func(s string) string { return s },
		u.runArtistPageReadJobs(ctx, filteredArtistJobs),
		artistsFromRatingsPage,
	)
	albums := deduplicateOn(
		ctx,
		u.concurrency,
		func(a scraper.Album) string {
			return fmt.Sprintf("%s - %s", a.Name, a.ArtistURL)
		},
		albumsFromRatingsPage,
	)

	return artists, albums
}

func (u *Updater) readArtistPages(ctx context.Context, in <-chan string) <-chan artistPageReadJob {
	g, ctx := errgroup.WithContext(ctx)
	out := make(chan artistPageReadJob, u.concurrency)

	for i := 0; i < u.concurrency; i++ {
		g.Go(func() error {
			log := logging.GetLogger(ctx)
			for a := range in {
				a := a
				log := log.With(zap.String("artist-url", a))
				page, err := u.getPage(ctx, a)
				if err != nil {
					if !errors.Is(err, context.Canceled) {
						log.With(zap.Error(err)).
							Error("could not get artist page")
					}
					continue
				}

				select {
				case out <- artistPageReadJob{
					page:   page,
					path:   a,
					reader: scraper.ReadArtistFromPage,
				}:
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
