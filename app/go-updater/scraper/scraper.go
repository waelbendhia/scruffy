package scraper

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log"
	"net/url"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/waelbendhia/scruffy/app/go-updater/logging"
	"go.uber.org/zap"
	"golang.org/x/net/html"
)

type PageReader func(context.Context, *goquery.Document) (map[string]string, error)

func linksAsMap(
	ctx context.Context, pagePath string, sel *goquery.Selection,
) map[string]string {
	as := map[string]string{}
	sel.Each(func(i int, s *goquery.Selection) {
		href, ok := s.Attr("href")
		if !ok {
			return
		}

		artistUrl, err := url.JoinPath(pagePath, "../", href)
		if err != nil {
			logging.GetLogger(ctx).
				With(zap.Error(err), zap.String("href", href)).
				Warn("could not join paths")
			return
		}

		as[artistUrl] = strings.TrimSpace(s.Text())
	})

	return as
}

const rockPagePath = "/music/groups.html"

func ReadArtistsFromRockPage(
	ctx context.Context, doc *goquery.Document,
) (map[string]string, error) {
	return linksAsMap(ctx, rockPagePath, doc.Find("table:nth-of-type(3) a")), nil
}

const jazzPagePath = "/jazz/musician.html"

func ReadArtistsFromJazzPage(
	ctx context.Context, doc *goquery.Document,
) (map[string]string, error) {
	return linksAsMap(ctx, jazzPagePath, doc.Find("[width=\"400\"] a[HREF]")), nil
}

func ReadArtistsFromVolumePage(volume int) PageReader {
	return func(
		ctx context.Context, doc *goquery.Document,
	) (map[string]string, error) {
		as := map[string]string{}
		doc.Find("select>option:not(:first-child)").Each(func(i int, s *goquery.Selection) {
			href, ok := s.Attr("value")
			if !ok {
				return
			}

			href, err := url.JoinPath(fmt.Sprintf("/vol%d/", volume), href)
			if err != nil {
				logging.GetLogger(ctx).
					With(zap.Error(err), zap.String("href", href)).
					Warn("could not join paths")
				return
			}

			as[href] = strings.TrimSpace(s.Text())
		})

		return as, nil
	}
}

type Album struct {
	PageURL    string
	ArtistURL  string
	ArtistName string
	Name       string
	Rating     float64
	Year       int
}

type Artist struct {
	URL            string
	Name           string
	Bio            string
	RelatedArtists []string
	Albums         []Album
}

var blackList = map[string]struct{}{
	"/vol6/current.html":  {},
	"/vol6/petshop.html":  {},
	"/vol5/knottmik.html": {},
	"/vol5/combine.html":  {},
	"/vol5/thornpau.html": {},
	"/vol3/tomrercl.html": {},
}

var nameExceptions = map[string]string{
	"/vol6/belleli.html": "Tractor's Revenge",
	"/vol7/blkjks.html":  "BLK JKS",
	"/vol7/kem.html":     "Kern",
	"/vol4/eae.html":     "The Electronic Art Ensemble",
	"/avant/zeier.html":  "Marc Zeier",
	"/vol6/aurora.html":  "Aurora Sutra",
}

var artistUrlRegex, _ = regexp.Compile("\\/(avant|jazz|vol).*\\.html$")

func getArtistName(artistURL string, doc *goquery.Document) (name string) {
	defer func() { name = strings.TrimSpace(name) }()
	name, ok := nameExceptions[artistURL]
	if ok {
		return
	}

	if name = doc.Find("center h1").Text(); name != "" {
		return
	}
	if name = doc.Find("center h2").Text(); name != "" {
		return
	}
	name = doc.Find("center font").First().Text()
	return
}

func shouldReadRightColumn(doc *goquery.Document) bool {
	return len(doc.Find("body[bgcolor=00ff00]").Nodes) > 0 ||
		strings.TrimSpace(doc.Find("center h2").Text()) == "June of 44" ||
		strings.TrimSpace(doc.Find("center>font>i").Text()) == "Aurora"

}

func getBioElementsByColor(doc *goquery.Document) (*goquery.Selection, bool) {
	if shouldReadRightColumn(doc) {
		return doc.Find(`td[bgcolor=e6dfaa]`), true
	}

	for _, color := range []string{"eebb88", "#eebb88", "e6dfaa"} {
		bioElems := doc.Find(fmt.Sprintf("td[bgcolor=%s]", color))
		if len(bioElems.Nodes) > 0 {
			return bioElems, true
		}
	}

	return nil, false
}

func children(n *html.Node) []*html.Node {
	cs := []*html.Node{}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		cs = append(cs, c)
	}

	return cs
}

func hasNegAttribSize(cc *html.Node) bool {
	return slices.ContainsFunc(cc.Attr, func(a html.Attribute) bool {
		return a.Key == "size" && a.Val == "-1"
	})
}

func flattenElement(n *html.Node) []*html.Node {
	ns := []*html.Node{}
	if n.Type != html.ElementNode {
		return ns
	}

	for _, c := range children(n) {
		switch c.Type {
		case html.TextNode:
			ns = append(ns, c)
		case html.ElementNode:
			switch c.Data {
			case "center":
				if slices.ContainsFunc(children(c), func(cc *html.Node) bool {
					return cc.Data == "font" && hasNegAttribSize(cc)
				}) {
					continue
				}

				ns = append(ns, flattenElement(c)...)
			case "td":
				ns = append(ns, flattenElement(c)...)
			default:
				ns = append(ns, c)
			}
		}
	}

	return ns
}

func getBioFromBody(doc *goquery.Document) string {
	bioElems, ok := getBioElementsByColor(doc)
	if !ok {
		return ""
	}

	ns := []*html.Node{}
	for _, n := range bioElems.Nodes {
		ns = append(ns, flattenElement(n)...)
	}

	var buf bytes.Buffer
	for _, n := range ns {
		if n.Type == html.TextNode {
			buf.WriteString(n.Data)
			continue
		}

		switch n.Data {
		case "font":
			if hasNegAttribSize(n) {
				continue
			}
			buf.WriteString(goquery.NewDocumentFromNode(n).Text())
		case "hr", "br":
			buf.WriteString("\n\n")
		case "p", "div":
			buf.WriteString("\n")
			buf.WriteString(goquery.NewDocumentFromNode(n).Text())
		default:
			buf.WriteString(goquery.NewDocumentFromNode(n).Text())
		}
	}

	return buf.String()
}

var albumPattern, _ = regexp.Compile(".+,{0,1} ([0-9]*.[0-9]+|[0-9]+)\\/10")

var (
	albumNamePattern = regexp.MustCompile("(^.+)([(].*[)])|(^.+)(,)")
	yearPattern      = regexp.MustCompile("([0-9]{4})(\\))")
	ratingPattern    = regexp.MustCompile("(([0-9].[0-9])|[0-9])(\\/10)")
)

func getAlbums(doc *goquery.Document) []Album {
	if len(doc.Find("table").Nodes) == 0 {
		log.Print("no table")
		return nil
	}

	albumText := doc.Find("table").First().Find("td:nth-of-type(1)").Text()

	albums := []Album{}
	for _, a := range albumPattern.FindAllString(albumText, -1) {

		nameMatches := albumNamePattern.FindStringSubmatch(a)
		if len(nameMatches) <= 1 {
			continue
		}

		name := nameMatches[1]

		matchedRating := ratingPattern.FindStringSubmatch(a)
		if len(matchedRating) <= 1 {
			continue
		}

		rating, err := strconv.ParseFloat(string(matchedRating[1]), 64)
		if err != nil {
			continue
		}

		var year int
		if matchedYear := yearPattern.FindStringSubmatch(a); len(matchedYear) > 1 {
			year, _ = strconv.Atoi(string(matchedYear[1]))
		}

		albums = append(albums, Album{
			Name:   strings.TrimSpace(name),
			Rating: rating,
			Year:   year,
		})
	}

	return albums
}

var (
	ErrBlackListed           = errors.New("artist is blacklisted")
	ErrDoesNotMatchArtistURL = errors.New("artistURL does not match expected format")
	ErrInvalidArtist         = errors.New("invalid artist")
)

type ArtistPageReader func(context.Context, string, *goquery.Document) (*Artist, error)

func ReadArtistFromPage(
	ctx context.Context, artistURL string, doc *goquery.Document,
) (*Artist, error) {
	_, isBlackListed := blackList[artistURL]
	switch {
	case isBlackListed:
		return nil, ErrBlackListed
	case !artistUrlRegex.Match([]byte(artistURL)):
		return nil, ErrDoesNotMatchArtistURL
	}

	if len(doc.Find("body[bgcolor=FFFFFF]").Nodes) > 0 {
		// It seems pages with a white background only contain a short bio
		// Italian
		return nil, fmt.Errorf(
			"artist '%s' has non standard bio: %w",
			artistURL, ErrInvalidArtist,
		)
	}

	name := getArtistName(artistURL, doc)
	if name == "" {
		return nil, fmt.Errorf(
			"artist '%s' has no name: %w",
			artistURL, ErrInvalidArtist,
		)
	}

	bio := strings.TrimSpace(getBioFromBody(doc))
	albums := getAlbums(doc)

	for i := range albums {
		albums[i].PageURL = artistURL
	}

	return &Artist{URL: artistURL, Name: name, Bio: bio, Albums: albums}, nil
}

type CDReviewReader func(context.Context, *goquery.Document) ([]Album, error)

func readRatingsFromCDReview(
	doc *goquery.Document, pagePath string, year int, selector string,
) ([]Album, error) {
	var as []Album
	doc.Find(selector).Each(func(i int, s *goquery.Selection) {
		artistLink := s.Find("td > a").First()
		albumLink := s.Find("td > a").Eq(1)

		href := artistLink.AttrOr("href", albumLink.AttrOr("href", ""))
		artistUrl, err := url.JoinPath(pagePath, "../", href)
		if err != nil {
			return
		}

		artistName := strings.TrimSpace(artistLink.Text())
		albumName := strings.TrimSpace(albumLink.Text())
		ratingText := s.Find("td[bgcolor=f00000]").Eq(0).Text()

		if href == "" || artistName == "" || albumName == "" || ratingText == "" {
			return
		}

		matchedRating := ratingPattern.FindStringSubmatch(ratingText)
		if len(matchedRating) <= 1 {
			return
		}

		rating, err := strconv.ParseFloat(string(matchedRating[1]), 64)
		if err != nil {
			return
		}

		as = append(as, Album{
			PageURL:    pagePath,
			ArtistURL:  artistUrl,
			ArtistName: artistName,
			Name:       albumName,
			Rating:     rating,
			Year:       year,
		})
	})

	return as, nil
}

func Read90sCDReviewPage(year int) CDReviewReader {
	return func(ctx context.Context, doc *goquery.Document) ([]Album, error) {
		return readRatingsFromCDReview(
			doc,
			fmt.Sprintf("/cdreview/%d.html", year),
			year,
			"table > tbody > tr",
		)
	}
}

func Read2000sCDReviewPage(year int) CDReviewReader {
	return func(ctx context.Context, doc *goquery.Document) ([]Album, error) {
		return readRatingsFromCDReview(
			doc,
			fmt.Sprintf("/cdreview/%d.html", year),
			year,
			"table[bgcolor=ffa000] > tbody > tr",
		)
	}
}

func ReadNewRatingsPage() CDReviewReader {
	return func(ctx context.Context, doc *goquery.Document) ([]Album, error) {
		return readRatingsFromCDReview(
			doc,
			"/cdreview/new.html",
			time.Now().Year(),
			"table[bgcolor=ffa000] > tbody > tr",
		)
	}
}
