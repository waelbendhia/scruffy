package scraper

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type ScruffyPage struct {
	Doc          *goquery.Document
	Hash         string
	LastModified time.Time
}

func ReadPage(ctx context.Context, resp *http.Response) (*ScruffyPage, error) {
	h := md5.New()
	body := io.TeeReader(resp.Body, h)
	doc, err := goquery.NewDocumentFromReader(body)
	if err != nil {
		return nil, fmt.Errorf("could not create document: %w", err)
	}

	lastModified, err := time.Parse(time.RFC1123, resp.Header.Get("last-modified"))
	if err != nil {
		lastModified = time.Now()
	}

	return &ScruffyPage{
		Hash:         hex.EncodeToString(h.Sum(nil)),
		LastModified: lastModified,
		Doc:          doc,
	}, nil
}
