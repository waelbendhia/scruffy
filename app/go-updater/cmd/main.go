package main

import (
	"context"
	"database/sql"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/waelbendhia/scruffy/app/go-updater/logging"
	"github.com/waelbendhia/scruffy/app/go-updater/provider"
	"github.com/waelbendhia/scruffy/app/go-updater/updater"
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

func initUpdater(ctx context.Context, db *sql.DB) *updater.Updater {
	opts := []updater.UpdaterOption{updater.WithConcurrency(max(runtime.NumCPU(), 4))}

	spotifyProvider := provider.NewSpotifyProvider(
		ctx,
		provider.SpotifyWithClient(
			(&clientcredentials.Config{
				ClientID:     os.Getenv("SPOTIFY_CLIENT_ID"),
				ClientSecret: os.Getenv("SPOTIFY_CLIENT_SECRET"),
				TokenURL:     "https://accounts.spotify.com/api/token",
			}).Client(ctx),
		),
	)
	deezerProvider := provider.NewDeezerProvider()

	for _, p := range strings.Split(",", os.Getenv("ARTIST_PROVIDERS")) {
		p := strings.ToLower(strings.TrimSpace(p))
		switch p {
		case "spotify":
			opts = append(opts, updater.AddArtistProvider(p, 1, spotifyProvider))
		case "deezer":
			opts = append(opts, updater.AddArtistProvider(p, 1, deezerProvider))
		}
	}

	for _, p := range strings.Split(",", os.Getenv("ALBUM_PROVIDERS")) {
		p := strings.ToLower(strings.TrimSpace(p))
		switch p {
		case "spotify":
			opts = append(opts, updater.AddAlbumProvider(p, 9, spotifyProvider))
		case "deezer":
			opts = append(opts, updater.AddAlbumProvider(p, 8, deezerProvider))
		case "musicbrainz":
			opts = append(opts, updater.AddAlbumProvider(p, 10, provider.NewMusicBrainzProvider()))
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
	onArtist        func(context.Context, updater.ArtistWithImage)
	onAlbum         func(context.Context, updater.AlbumWithImage)
}

func (u *updateRunner) runUpdatesForever(ctx context.Context, startSignal <-chan struct{}) func() {
	ch := make(chan struct{})
	go func() {
		defer close(ch)
		for {
			u.runUpdate(ctx)
			select {
			case <-time.After(u.updateInterval):
			case <-startSignal:
			case <-ctx.Done():
				return
			}
		}
	}()
	return func() { <-ch }
}

func (u *updateRunner) runUpdate(ctx context.Context) {
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
		for a := range finalArtists {
			u.onArtist(ctx, a)
			count++
		}
		logger.With(zap.Int("count", count)).Info("inserted artists")
		return nil
	})
	g.Go(func() error {
		count := 0
		for a := range finalAlbums {
			u.onAlbum(ctx, a)
			count++
		}
		logger.With(zap.Int("count", count)).Info("inserted albums")
		return nil
	})

	if err := g.Wait(); err != nil {
		logger.With(zap.Error(err)).Error("processing failed")
	}
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

	db, err := sql.Open("sqlite3", os.Getenv("DATABASE_PATH"))
	if err != nil {
		logger.With(zap.Error(err)).Fatal("could not open db")
	}

	defer db.Close()

	ur := updateRunner{
		Updater:         initUpdater(ctx, db),
		updateInterval:  updateInterval,
		onArtist:        func(ctx context.Context, awi updater.ArtistWithImage) {},
		onAlbum:         func(ctx context.Context, awi updater.AlbumWithImage) {},
		filterUnchanged: false,
	}
	wait := ur.runUpdatesForever(ctx, nil)
	defer wait()
}
