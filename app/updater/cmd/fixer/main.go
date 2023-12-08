package main

import (
	"context"
	"database/sql"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"unicode/utf8"

	_ "github.com/mattn/go-sqlite3"
	"github.com/waelbendhia/scruffy/app/updater/database"
	"go.uber.org/zap"
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

func main() {
	ctx := signalContext()

	var logger *zap.Logger
	if os.Getenv("ENV") == "production" {
		logger, _ = zap.NewProduction()
	} else {
		logger, _ = zap.NewDevelopment()
	}
	defer logger.Sync()

	db, err := sql.Open("sqlite3", os.Getenv("DATABASE_PATH"))
	if err != nil {
		logger.With(zap.Error(err)).Fatal("could not open db")
	}

	defer db.Close()

	var txClosed bool

	tx, err := db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		logger.With(zap.Error(err)).Error("could not open db")
		return
	}

	defer func() {
		if !txClosed {
			if err := tx.Rollback(); err != nil {
				logger.With(zap.Error(err)).Error("could not close db")
			}
		}
	}()

	q := database.New(tx)
	bios, err := q.SelectAllBios(ctx)
	if err != nil {
		logger.With(zap.Error(err)).Error("could not read bios")
		return
	}

	for _, a := range bios {
		bio := a.Bio.String
		if utf8.ValidString(bio) {
			continue
		}

		bio = strings.ToValidUTF8(bio, "")
		if err := q.UpdateBio(ctx, database.UpdateBioParams{
			Url: a.Url,
			Bio: sql.NullString{Valid: true, String: bio},
		}); err != nil {
			logger.With(zap.Error(err), zap.String("url", a.Url)).
				Error("could not update bio")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		logger.With(zap.Error(err)).Error("could not commit transaction")
	}

	txClosed = true
}
