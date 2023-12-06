package updater

import (
	"database/sql"
	"net/http"
	"runtime"
	"time"

	"github.com/waelbendhia/scruffy/app/go-updater/provider"
	"github.com/waelbendhia/scruffy/app/go-updater/rate"
)

type (
	withWeight[T any] struct {
		weight   int
		provider T
	}
	Updater struct {
		albumProviders  map[string]withWeight[provider.AlbumProvider]
		artistProviders map[string]withWeight[provider.ArtistProvider]

		db *sql.DB

		client  *http.Client
		limiter *rate.Limiter

		concurrency int
	}
	UpdaterOption func(*Updater)
)

func WithClient(c *http.Client) UpdaterOption   { return func(u *Updater) { u.client = c } }
func WithLimiter(l *rate.Limiter) UpdaterOption { return func(u *Updater) { u.limiter = l } }
func WithConcurrency(c int) UpdaterOption       { return func(u *Updater) { u.concurrency = c } }

func AddAlbumProvider(name string, weight int, p provider.AlbumProvider) UpdaterOption {
	return func(u *Updater) {
		if u.albumProviders == nil {
			u.albumProviders = map[string]withWeight[provider.AlbumProvider]{}
		}
		u.albumProviders[name] = withWeight[provider.AlbumProvider]{provider: p, weight: weight}
	}
}

func AddArtistProvider(name string, weight int, p provider.ArtistProvider) UpdaterOption {
	return func(u *Updater) {
		if u.artistProviders == nil {
			u.artistProviders = map[string]withWeight[provider.ArtistProvider]{}
		}
		u.artistProviders[name] = withWeight[provider.ArtistProvider]{provider: p, weight: weight}
	}
}

func NewUpdater(db *sql.DB, opts ...UpdaterOption) *Updater {
	u := &Updater{db: db}
	for _, opt := range opts {
		opt(u)
	}

	if u.albumProviders == nil {
		u.albumProviders = map[string]withWeight[provider.AlbumProvider]{}
	}
	if u.artistProviders == nil {
		u.artistProviders = map[string]withWeight[provider.ArtistProvider]{}
	}
	if u.client == nil {
		u.client = &http.Client{}
	}
	if u.limiter == nil {
		u.limiter = rate.NewLimiter(5, time.Second)
	}
	if u.concurrency == 0 {
		u.concurrency = runtime.NumCPU()
	}

	return u
}
