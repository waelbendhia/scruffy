package scraper_test

import (
	"bytes"
	"context"
	_ "embed"
	"errors"
	"regexp"
	"slices"
	"testing"

	"github.com/PuerkitoBio/goquery"
	"github.com/waelbendhia/scruffy/app/go-updater/scraper"
)

//go:embed list-pages/rock.html
var pageRock []byte

//go:embed list-pages/jazz.html
var pageJazz []byte

//go:embed list-pages/vol1.html
var pageVol1 []byte

//go:embed list-pages/vol6.html
var pageVol6 []byte

type pageReaderTest struct {
	name          string
	page          []byte
	read          scraper.PageReader
	expectedLen   int
	shouldContain map[string]string
}

func (prt *pageReaderTest) run(t *testing.T) {
	ctx := context.Background()
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(prt.page))
	if err != nil {
		t.Fatal("could not create goquery Document")
	}

	as, err := prt.read(ctx, doc)
	if err != nil {
		t.Fatalf("page reader failed: %v", err)
		return
	}

	if len(as) != prt.expectedLen {
		t.Fatalf("expected to find %d artists got %d", prt.expectedLen, len(as))
	}

	for artistUrl, name := range prt.shouldContain {
		if as[artistUrl] != name {
			t.Fatalf(
				"expected results to contain name '%s' at url '%s' got '%s'",
				artistUrl, name, as[artistUrl],
			)
		}
	}
}

func TestPageReaders(t *testing.T) {
	tts := []pageReaderTest{
		{
			name:        "read rock page",
			page:        pageRock,
			read:        scraper.ReadArtistsFromRockPage,
			expectedLen: 7477,

			shouldContain: map[string]string{
				"/vol3/zztop.html":  "ZZ Top",
				"/vol3/156075.html": "15-60-75",
				"/vol4/gibson.html": "Gibson Brothers",
			},
		},
		{
			name:        "read jazz page",
			page:        pageJazz,
			read:        scraper.ReadArtistsFromJazzPage,
			expectedLen: 590,

			shouldContain: map[string]string{
				"/jazz/abe.html":       "Kaoru Abe",
				"/avant/cambuzat.html": "Francois Cambuzat",
				"/avant/zummo.html":    "Peter Zummo",
			},
		},
		{
			name:        "read vol1 page",
			page:        pageVol1,
			read:        scraper.ReadArtistsFromVolumePage(1),
			expectedLen: 234,

			shouldContain: map[string]string{
				"/vol1/sete.html":     "Bola Sete",
				"/vol1/fahey.html":    "John Fahey",
				"/vol1/kuti.html":     "Fela Anikulapo Kuti",
				"/vol1/robinson.html": "Smokey Robinson",
				"/vol1/reed.html":     "Jimmy Reed",
				"/vol1/sloan.html":    "Philip Sloan",
				"/vol1/wolf.html":     "Howling Wolf",
				"/vol1/acuff.html":    "Roy Acuff",
				"/vol1/andersen.html": "Eric Andersen",
				"/vol1/ammons.html":   "Albert Ammons",
			},
		},
		{
			name:        "read vol6 page",
			page:        pageVol6,
			read:        scraper.ReadArtistsFromVolumePage(6),
			expectedLen: 962,

			shouldContain: map[string]string{
				"/vol6/evidence.html": "Evidence",
				"/vol6/lassigue.html": "Seti",
				"/vol6/fiftyton.html": "50 Tons Of Black Terror",
				"/vol6/arkane.html":   "Sufi",
				"/vol6/afterhou.html": "Afterhours",
				"/vol6/alboth.html":   "Alboth!",
				"/vol6/amerruse.html": "American Ruse",
				"/vol6/ass.html":      "Teengenerate",
				"/vol6/lagowsky.html": "SETI",
				"/vol6/pansonic.html": "Zero",
			},
		},
	}

	for _, tt := range tts {
		t.Run(tt.name, tt.run)
	}
}

type artistReaderTest struct {
	page                 []byte
	artistURL            string
	expectErr            error
	name                 string
	albums               []scraper.Album
	startRegex, endRegex string
}

func (art *artistReaderTest) run(t *testing.T) {
	ctx := context.Background()

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(art.page))
	if err != nil {
		t.Fatal("could not create goquery Document")
	}

	a, err := scraper.ReadArtistFromPage(ctx, art.artistURL, doc)
	switch {
	case art.expectErr != nil:
		if !errors.Is(err, art.expectErr) {
			t.Fatalf(
				"expected reader to fail with '%v' received '%v'",
				art.expectErr, err,
			)
		}

		return
	case err != nil:
		t.Fatalf("artist reader failed: %v", err)
		return
	}

	switch {
	case art.name != a.Name:
		t.Fatalf("expected to find name '%s' got '%s'", art.name, a.Name)
	case !regexp.MustCompile(art.startRegex).Match([]byte(a.Bio)):
		t.Fatalf(
			"Bio '%.10s...' does not match pattern '%s'",
			a.Bio, art.startRegex,
		)
	case !regexp.MustCompile(art.endRegex).Match([]byte(a.Bio)):
		t.Fatalf(
			"Bio '...%s' does not match pattern '%s'",
			a.Bio[len(a.Bio)-10:], art.startRegex,
		)
	}

	for _, ea := range art.albums {
		t.Log(a.Albums)
		i := slices.IndexFunc(a.Albums, func(a scraper.Album) bool {
			return a.Name == ea.Name
		})
		if i == -1 {
			t.Fatalf("did not find album '%s' in results", ea.Name)
		}

		ra := a.Albums[i]
		switch {
		case ra.Name != ea.Name:
			t.Fatalf("expected album name '%s' go '%s'", ea.Name, ra.Name)
		case ra.Year != ea.Year:
			t.Fatalf("expected album year '%d' go '%d'", ea.Year, ra.Year)
		case ra.Rating != ea.Rating:
			t.Fatalf("expected album rating '%f' go '%f'", ea.Rating, ra.Rating)
		}
	}
}

//go:embed artist-pages/100gecs.html
var page100Gecs []byte

//go:embed artist-pages/beatles.html
var pageBeatles []byte

func TestArtistReader(t *testing.T) {
	tts := []artistReaderTest{
		{
			page:       page100Gecs,
			artistURL:  "/vol8/100gecs.html",
			name:       "100 Gecs",
			startRegex: "^Missouri's duo 100 Gecs",
			endRegex:   "with Josh Pan\\.$",
			albums:     []scraper.Album{},
		},
		{
			page:       pageBeatles,
			artistURL:  "/vol1/beatles.html",
			name:       "Beatles",
			startRegex: "^The fact that",
			endRegex:   "they never said it\\.$",
			albums: []scraper.Album{
				{Name: "Please Please Me", Year: 1963, Rating: 3},
				{Name: "With The Beatles", Year: 1963, Rating: 3},
				{Name: "Meet The Beatles", Year: 1964, Rating: 4},
				{Name: "Hard Days' Night", Year: 1964, Rating: 5},
				{Name: "For Sale", Year: 1964, Rating: 3},
				{Name: "Help", Year: 1965, Rating: 3},
				{Name: "Rubber Soul", Year: 1965, Rating: 5},
				{Name: "Revolver", Year: 1966, Rating: 5},
				{Name: "Sgt Pepper's Lonely Hearts Club Band", Year: 1967, Rating: 7},
				{Name: "Magical Mystery Tour", Year: 1967, Rating: 6},
				{Name: "The Beatles", Year: 1968, Rating: 6},
				{Name: "Yellow Submarine", Year: 1969, Rating: 5},
				{Name: "Abbey Road", Year: 1969, Rating: 7},
				{Name: "Let It Be", Year: 1970, Rating: 4},
				{Name: "George Harrison: Wonderwall", Year: 1968, Rating: 5},
				{Name: "George Harrison: Electronic Sounds", Year: 1969, Rating: 6},
				{
					Name:   "George Harrison: All Things Must Pass",
					Year:   1970,
					Rating: 6.5,
				},
				{
					Name:   "John Lennon: John Lennon/ Plastic Ono Band",
					Year:   1970,
					Rating: 6.5,
				},
				{Name: "John Lennon: Imagine", Year: 1971, Rating: 5},
				{Name: "John Lennon: Double Fantasy", Year: 1980, Rating: 5},
				{Name: "Paul McCartney: Band On The Run", Year: 1973, Rating: 5},
				{Name: "Paul McCartney: Tug Of War", Year: 1982, Rating: 5},
			},
		},
	}

	for _, tt := range tts {
		t.Run(tt.name, tt.run)
	}
}

type cdReaderTest struct {
	name          string
	page          []byte
	read          scraper.CDReviewReader
	expectedLen   int
	shouldContain []scraper.Album
}

//go:embed list-pages/1990.html
var page1990 []byte

func (crt *cdReaderTest) run(t *testing.T) {
	ctx := context.Background()

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(crt.page))
	if err != nil {
		t.Fatal("could not create goquery Document")
	}

	as, err := crt.read(ctx, doc)
	if err != nil {
		t.Fatalf("cd review reader failed: %v", err)
		return
	}

	if len(as) != crt.expectedLen {
		t.Fatalf("expected to find %d artists got %d", crt.expectedLen, len(as))
	}

	for _, ea := range crt.shouldContain {
		i := slices.IndexFunc(as, func(a scraper.Album) bool {
			return ea.ArtistURL == a.ArtistURL && ea.Name == a.Name
		})
		if i == -1 {
			t.Fatalf("expected to find album '%s - %s'", ea.Name, ea.ArtistURL)
		}

		a := as[i]

		switch {
		case ea.Name != ea.Name:
			t.Fatalf("expected album name '%s' go '%s'", ea.Name, a.Name)
		case ea.Year != ea.Year:
			t.Fatalf("expected album year '%d' go '%d'", ea.Year, a.Year)
		case ea.Rating != ea.Rating:
			t.Fatalf("expected album rating '%f' go '%f'", ea.Rating, a.Rating)
		}
	}
}

func TestCDReaders(t *testing.T) {

	tts := []cdReaderTest{
		{
			name:        "ratings for 1990",
			page:        page1990,
			read:        scraper.Read90sCDReviewPage(1990),
			expectedLen: 457,
			shouldContain: []scraper.Album{
				{
					ArtistURL: "/vol6/guycalle.html",
					Name:      "Automanikk",
					Rating:    6,
					Year:      1990,
				},
				{
					ArtistURL: "/vol5/antbee.html",
					Name:      "Pure Electric Honey",
					Rating:    8,
					Year:      1990,
				},
				{
					ArtistURL: "/vol4/zoviet.html",
					Name:      "Look Into Me",
					Rating:    4,
					Year:      1990,
				},
			},
		},
	}

	for _, tt := range tts {
		t.Run(tt.name, tt.run)
	}
}
