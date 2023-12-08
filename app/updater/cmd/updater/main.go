package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	ginzap "github.com/gin-contrib/zap"
	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
	"github.com/redis/go-redis/v9"
	"github.com/waelbendhia/scruffy/app/updater/logging"
	"github.com/waelbendhia/scruffy/app/updater/provider"
	"github.com/waelbendhia/scruffy/app/updater/scraper"
	"github.com/waelbendhia/scruffy/app/updater/server"
	"github.com/waelbendhia/scruffy/app/updater/status"
	"github.com/waelbendhia/scruffy/app/updater/updater"
	"go.uber.org/zap"
	"golang.org/x/oauth2/clientcredentials"
	"golang.org/x/sync/errgroup"
)

func signalContext() context.Context {
	ctx, cancel := context.WithCancel(context.Background())
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigs
		cancel()
	}()
	return ctx
}

func initUpdater(
	ctx context.Context,
	db *sql.DB,
	sp *provider.SpotifyProvider,
	dp *provider.DeezerProvider,
	mbp *provider.MusicBrainzProvider,
	su *status.StatusUpdater,
) *updater.Updater {
	opts := []updater.UpdaterOption{
		updater.WithConcurrency(max(runtime.NumCPU(), 4)),
		updater.WithErrorHook(func(err error) { su.AddError(ctx, err) }),
		updater.WithPageHook(func(*scraper.ScruffyPage) { su.IncrementPages(ctx) }),
		updater.AddArtistProvider(1, sp),
		updater.AddArtistProvider(1, dp),
		updater.AddAlbumProvider(9, sp),
		updater.AddAlbumProvider(8, dp),
		updater.AddAlbumProvider(10, mbp),
	}

	for _, p := range strings.Split(os.Getenv("ARTIST_PROVIDERS"), ",") {
		p := strings.ToLower(strings.TrimSpace(p))
		switch p {
		case "spotify":
			sp.Enable()
		case "deezer":
			dp.Enable()
		}
	}

	for _, p := range strings.Split(os.Getenv("ALBUM_PROVIDERS"), ",") {
		p := strings.ToLower(strings.TrimSpace(p))
		switch p {
		case "spotify":
			sp.Enable()
		case "deezer":
			dp.Enable()
		case "musicbrainz":
			mbp.Enable()
		case "lastfm":
			// TODO: implement LastFM provider
			logging.GetLogger(ctx).Warn("last.fm provider not implemented")
		}
	}

	return updater.NewUpdater(db, opts...)
}

type updateRunner struct {
	cancelLock sync.Mutex
	cancel     func()
	*updater.Updater
	filterUnchanged bool
	updateInterval  time.Duration
}

func (u *updateRunner) runUpdatesForever(
	ctx context.Context,
	startSignal <-chan struct{},
	onStart func(context.Context),
	onEnd func(context.Context),
	onArtist func(context.Context),
	onAlbum func(context.Context),
) {
	for {
		onStart(ctx)
		u.runUpdate(ctx, onArtist, onAlbum)
		onEnd(ctx)
		select {
		case <-time.After(u.updateInterval):
		case <-startSignal:
		case <-ctx.Done():
			return
		}
	}
}

func (u *updateRunner) runUpdate(
	ctx context.Context,
	onArtist func(context.Context),
	onAlbum func(context.Context),
) {
	ctx, cancel := context.WithCancel(ctx)

	u.cancelLock.Lock()
	u.cancel = cancel
	u.cancelLock.Unlock()

	logger := logging.GetLogger(ctx)

	start := time.Now()

	logger.Info("starting update")
	defer func() {
		logger.With(zap.Duration("duration", time.Since(start))).Info("update finished")
	}()

	ars, als := u.GetAllArtistsAndRatings(ctx, u.filterUnchanged)
	artistsWithImages, albums := u.ProcessArtists(ctx, u.filterUnchanged, ars)
	finalArtists := u.InsertArtists(ctx, artistsWithImages)
	processedAlbums := u.ProcessAlbums(ctx, u.filterUnchanged, als, albums)
	finalAlbums := u.InsertAlbums(ctx, processedAlbums)

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		count := 0
		for range finalArtists {
			onArtist(ctx)
			count++
		}
		logger.With(zap.Int("count", count)).Info("inserted artists")
		return nil
	})
	g.Go(func() error {
		count := 0
		for range finalAlbums {
			onAlbum(ctx)
			count++
		}
		logger.With(zap.Int("count", count)).Info("inserted albums")
		return nil
	})

	if err := g.Wait(); err != nil {
		logger.With(zap.Error(err)).Error("processing failed")
	}
}

type runner struct {
	*updateRunner
	startCh chan<- struct{}
}

func (r *runner) StopUpdate(context.Context) error {
	r.cancelLock.Lock()
	defer r.cancelLock.Unlock()
	r.cancel()
	return nil
}

func (r *runner) StartUpdate(ctx context.Context) error {
	select {
	case r.startCh <- struct{}{}:
	case <-ctx.Done():
		return ctx.Err()
	}
	return nil
}

func main() {
	ctx := signalContext()
	var logger *zap.Logger
	if os.Getenv("ENV") == "production" {
		logger, _ = zap.NewProduction()
	} else {
		logger, _ = zap.NewDevelopment()
	}
	defer logger.Sync()
	ctx = logging.SetLogger(ctx, logger)

	updateInterval := time.Hour * 48
	if i := os.Getenv("UPDATE_INTERVAL"); i != "" {
		var err error
		updateInterval, err = time.ParseDuration(i)
		if err != nil {
			logger.With(
				zap.String("update-interval", i),
				zap.Error(err),
			).Fatal("could not parse update interval")
		}
	}

	var revalidator status.Revalidator = status.NoopRevalidator{}
	if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
		opts, err := redis.ParseURL(redisURL)
		if err != nil {
			logger.With(zap.Error(err)).Fatal("could not parse Redis URL")
		}

		revalidator = &status.RedisRevalidator{Client: redis.NewClient(opts)}
	}

	su := status.NewStatusUpdater(status.WithRevalidator(revalidator))

	db, err := sql.Open("sqlite3", os.Getenv("DATABASE_PATH"))
	if err != nil {
		logger.With(zap.Error(err)).Fatal("could not open db")
	}

	defer db.Close()

	sp := provider.NewSpotifyProvider(
		ctx,
		provider.SpotifyWithClient(
			(&clientcredentials.Config{
				ClientID:     os.Getenv("SPOTIFY_CLIENT_ID"),
				ClientSecret: os.Getenv("SPOTIFY_CLIENT_SECRET"),
				TokenURL:     "https://accounts.spotify.com/api/token",
			}).Client(ctx),
		),
	)
	dp := provider.NewDeezerProvider()
	mbp := provider.NewMusicBrainzProvider()

	ur := updateRunner{
		Updater:         initUpdater(ctx, db, sp, dp, mbp, su),
		updateInterval:  updateInterval,
                // TODO: make this configurable at runtime.
		filterUnchanged: os.Getenv("FILTER_UNCHANGED") == "true",
	}

	startCh := make(chan struct{}, 1)

	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		ur.runUpdatesForever(
			ctx,
			startCh,
			func(ctx context.Context) { su.StartUpdate(ctx) },
			func(ctx context.Context) { su.EndUpdate(ctx) },
			func(ctx context.Context) { su.IncrementArtists(ctx) },
			func(ctx context.Context) { su.IncrementAlbums(ctx) },
		)
		return nil
	})
	g.Go(func() error {
		engine := gin.New()
		engine.Use(ginzap.Ginzap(logger, time.RFC3339, false))

		s := server.New(
			db,
			&runner{updateRunner: &ur, startCh: startCh},
			su,
			server.AddArtistProviders(sp),
			server.AddArtistProviders(dp),
			server.AddAlbumProviders(sp),
			server.AddAlbumProviders(dp),
			server.AddAlbumProviders(mbp),
		)

		s.Routing(engine)

		var port = os.Getenv("UPDATER_PORT")
		var host = os.Getenv("UPDATER_HOST")
		if host == "" {
			host = "0.0.0.0"
		}
		if port == "" {
			port = "8002"
		}

		srv := &http.Server{
			Addr:    fmt.Sprintf(":%s", port),
			Handler: engine,
		}

		go func() {
			<-ctx.Done()
			ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			defer cancel()
			srv.Shutdown(ctx)
		}()

		return srv.ListenAndServe()
	})

	if err := g.Wait(); err != nil && !errors.Is(err, context.Canceled) {
		logger.With(zap.Error(err)).Error("shutdown failed")
	}
}
