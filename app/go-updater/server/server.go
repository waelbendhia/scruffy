package server

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/waelbendhia/scruffy/app/go-updater/database"
	"github.com/waelbendhia/scruffy/app/go-updater/provider"
	"github.com/waelbendhia/scruffy/app/go-updater/status"
)

type (
	UpdateRunner interface {
		StartUpdate(ctx context.Context) error
		StopUpdate(ctx context.Context) error
	}

	StatusUpdater interface {
		GetStatus(context.Context) (*status.UpdateStatus, error)
		ListenForUdpates(ctx context.Context) <-chan status.UpdateStatus
	}
	Server struct {
		db *sql.DB

		updateRunner  UpdateRunner
		statusUpdater StatusUpdater

		albumProviders  map[string]provider.AlbumProvider
		artistProviders map[string]provider.ArtistProvider
	}
	ServerOption func(*Server)
)

func AddArtistProviders(ps ...provider.ArtistProvider) ServerOption {
	return func(s *Server) {
		for _, p := range ps {
			s.artistProviders[p.Name()] = p
		}
	}
}

func AddAlbumProviders(ps ...provider.AlbumProvider) ServerOption {
	return func(s *Server) {
		for _, p := range ps {
			s.albumProviders[p.Name()] = p
		}
	}
}

func New(db *sql.DB, ur UpdateRunner, su StatusUpdater, opts ...ServerOption) *Server {
	s := &Server{
		db:              db,
		updateRunner:    ur,
		statusUpdater:   su,
		artistProviders: map[string]provider.ArtistProvider{},
		albumProviders:  map[string]provider.AlbumProvider{},
	}

	for _, opt := range opts {
		opt(s)
	}

	return s
}

func (s *Server) Routing(r gin.IRouter) {
	for p := range s.artistProviders {
		r.GET(fmt.Sprintf("/%s/artist/:artist", p), s.artistHandler(p))
	}

	for p := range s.albumProviders {
		r.GET(fmt.Sprintf("/%s/artist/:artist/album/:album", p), s.albumHandler(p))
	}

	r.GET("/providers/artist", s.getArtistProviders)
	r.PUT("/providers/artist", s.updateArtistProviders)

	r.GET("/providers/album", s.getAlbumProviders)
	r.PUT("/providers/album", s.updateAlbumProviders)

	r.PUT("/artist/:vol/:path", s.updateArtist)
	r.PUT("/artist/:vol/:path/album/:name", s.updateAlbum)

	r.GET("/update/status", s.getUpdateStatus)
	r.GET("/update/live", s.updatesSSE)
	r.PUT("/update/stop", s.stopUpdate)
	r.PUT("/update/start", s.startUpdate)

	r.DELETE("/all-data", s.clearData)
}

func (s *Server) artistHandler(provider string) gin.HandlerFunc {
	return func(c *gin.Context) {
		provider, ok := s.artistProviders[provider]
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{
				"message": fmt.Sprintf(
					"Artist provider '%s' is disabled but no provider found.",
					provider,
				),
				"error": "Not Found",
			})
			return
		}

		as, err := provider.SearchArtists(c.Request.Context(), c.Param("artist"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Error"})
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, as)
	}
}

func (s *Server) albumHandler(provider string) gin.HandlerFunc {
	return func(c *gin.Context) {
		provider, ok := s.albumProviders[provider]
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{
				"message": fmt.Sprintf(
					"Album provider '%s' is disabled but no provider found.",
					provider,
				),
				"error": "Not Found",
			})
			return
		}

		as, err := provider.SearchAlbums(
			c.Request.Context(), c.Param("artist"), c.Param("album"),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Error"})
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, as)
	}
}

func (s *Server) getArtistProviders(c *gin.Context) {
	providers := make([]string, len(s.artistProviders))
	for k := range s.artistProviders {
		providers = append(providers, k)
	}

	c.JSON(http.StatusOK, providers)
}

func (s *Server) updateArtistProviders(c *gin.Context) {
	var ps map[string]bool
	if err := c.Bind(&ps); err != nil {
		return
	}

	for name, enabled := range ps {
		p, ok := s.albumProviders[name]
		if !ok {
			continue
		}

		if enabled {
			p.Enable()
		} else {
			p.Disable()
		}
	}

	c.Status(http.StatusNoContent)
}

func (s *Server) getAlbumProviders(c *gin.Context) {
	providers := make([]string, len(s.albumProviders))
	for k := range s.albumProviders {
		providers = append(providers, k)
	}

	c.JSON(http.StatusOK, providers)
}

func (s *Server) updateAlbumProviders(c *gin.Context) {
	var ps map[string]bool
	if err := c.Bind(&ps); err != nil {
		return
	}

	for name, enabled := range ps {
		p, ok := s.artistProviders[name]
		if !ok {
			continue
		}

		if enabled {
			p.Enable()
		} else {
			p.Disable()
		}
	}

	c.Status(http.StatusNoContent)
}

type ArtistUpdateRequest struct {
	Name     string `json:"name"`
	ImageUrl string `json:"imageUrl"`
}

func (s *Server) updateArtist(c *gin.Context) {
	var u ArtistUpdateRequest
	if err := c.Bind(&u); err != nil {
		return
	}

	vol, path := c.Param("vol"), c.Param("path")

	_, err := database.New(s.db).UpdateArtistNameAndImage(
		c.Request.Context(),
		database.UpdateArtistNameAndImageParams{
			Name: sql.NullString{
				Valid:  u.Name != "",
				String: u.Name,
			},
			Imageurl: sql.NullString{
				Valid:  u.ImageUrl != "",
				String: u.ImageUrl,
			},
			Url: fmt.Sprintf("/%s/%s.html", vol, path),
		},
	)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"message": "Artist not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal Error"})
		c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}

type AlbumUpdate struct {
	Name     string `json:"name"`
	Year     int    `json:"year"`
	ImageUrl string `json:"imageUrl"`
}

func (s *Server) updateAlbum(c *gin.Context) {
	var u AlbumUpdate
	if err := c.Bind(&u); err != nil {
		return
	}

	vol, path, name := c.Param("vol"), c.Param("path"), c.Param("name")

	_, err := database.New(s.db).UpdateAlbum(
		c.Request.Context(),
		database.UpdateAlbumParams{
			Newname: sql.NullString{
				Valid:  u.Name != "",
				String: u.Name,
			},
			Year: sql.NullInt64{
				Valid: u.Year != 0,
				Int64: int64(u.Year),
			},
			Imageurl: sql.NullString{
				Valid:  u.ImageUrl != "",
				String: u.ImageUrl,
			},
			ArtistUrl: fmt.Sprintf("/%s/%s.html", vol, path),
			Name:      name,
		},
	)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"message": "Album not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal Error"})
		c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}

func (s *Server) getUpdateStatus(c *gin.Context) {
	us, err := s.statusUpdater.GetStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal Error"})
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, us)
}

func (s *Server) startUpdate(c *gin.Context) {
	if err := s.updateRunner.StartUpdate(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal Error"})
		c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}

func (s *Server) stopUpdate(c *gin.Context) {
	if err := s.updateRunner.StopUpdate(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal Error"})
		c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}

func (s *Server) updatesSSE(c *gin.Context) {
	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()
	msgCh := s.statusUpdater.ListenForUdpates(ctx)
	c.Stream(func(w io.Writer) bool {
		msg, ok := <-msgCh
		if ok {
			c.SSEvent("update-status", msg)
		}
		return ok
	})
}

func (s *Server) clearData(c *gin.Context) {
	tx, err := s.db.BeginTx(c.Request.Context(), &sql.TxOptions{
		Isolation: sql.LevelSerializable,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal Error"})
		c.Error(err)
		return
	}

	var successful bool
	defer func() {
		if !successful {
			tx.Rollback()
		}
	}()

	for _, s := range []string{
		`DELETE FROM "Album"`,
		`DELETE FROM "Artist"`,
		`DELETE FROM "UpdateHistory"`,
	} {
		_, err := tx.ExecContext(c.Request.Context(), s)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal Error"})
			c.Error(err)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal Error"})
		c.Error(err)
		return
	}

	successful = true

	c.Status(http.StatusNoContent)
}
