import * as fs from "node:fs/promises";
import {
  readArtistFromArtistPage,
  readArtistsFromJazzPage,
  readArtistsFromNewPage,
  readArtistsFromVolumePage,
} from "../src/artist";
import * as path from "node:path";

const beatleAlbums = [
  { name: "Please Please Me", year: 1963, rating: 3 },
  { name: "With The Beatles", year: 1963, rating: 3 },
  { name: "Meet The Beatles", year: 1964, rating: 4 },
  { name: "Hard Days' Night", year: 1964, rating: 5 },
  { name: "For Sale", year: 1964, rating: 3 },
  { name: "Help", year: 1965, rating: 3 },
  { name: "Rubber Soul", year: 1965, rating: 5 },
  { name: "Revolver", year: 1966, rating: 5 },
  {
    name: "Sgt Pepper's Lonely Hearts Club Band",
    year: 1967,
    rating: 7,
  },
  { name: "Magical Mystery Tour", year: 1967, rating: 6 },
  { name: "The Beatles", year: 1968, rating: 6 },
  { name: "Yellow Submarine", year: 1969, rating: 5 },
  { name: "Abbey Road", year: 1969, rating: 7 },
  { name: "Let It Be", year: 1970, rating: 4 },
  { name: "George Harrison: Wonderwall", year: 1968, rating: 5 },
  {
    name: "George Harrison: Electronic Sounds",
    year: 1969,

    rating: 6,
  },
  {
    name: "George Harrison: All Things Must Pass",
    year: 1970,
    rating: 6.5,
  },
  {
    name: "John Lennon: John Lennon/ Plastic Ono Band",
    year: 1970,
    rating: 6.5,
  },
  { name: "John Lennon: Imagine", year: 1971, rating: 5 },
  { name: "John Lennon: Double Fantasy", year: 1980, rating: 5 },
  { name: "Paul McCartney: Band On The Run", year: 1973, rating: 5 },
  { name: "Paul McCartney: Tug Of War", year: 1982, rating: 5 },
];

const mingusAlbums = [
  { name: "Jazz At The Massey Hall", year: 1953, rating: 7 },
  { name: "Pithecanthropus Erectus", year: 1956, rating: 8 },
  { name: "The Clown", year: 1957, rating: 6.5 },
  { name: "Tijuana Moods", year: 1957, rating: 7.5 },
  { name: "Mingus Ah Um", year: 1959, rating: 8 },
  { name: "Blues and Roots", year: 1959, rating: 8 },
  { name: "Dynasty", year: 1959, rating: 5 },
  { name: "Presents", year: 1960, rating: 8 },
  { name: "Mingus", year: 1960, rating: 6 },
  { name: "Town Hall Concert", year: 1962, rating: 6 },
  { name: "Oh Yeah", year: 1961, rating: 7.5 },
  { name: "Epitaph", year: 1962, rating: 8 },
  {
    name: "The Black Saint and The Sinner Lady",
    year: 1963,
    rating: 9,
  },
  { name: "Mingus Mingus Mingus Mingus", year: 1963, rating: 5 },
  { name: "Mingus Plays Piano", year: 1963, rating: 4 },
  { name: "Great Concert of Charles Mingus", year: 1964, rating: 5.5 },
  { name: "Let My Children Hear Music", year: 1971, rating: 8 },
  { name: "Jazz in Detroit", year: 1973, rating: 5 },
];

const readFileRel = (filepath: string) =>
  fs.readFile(path.resolve(__dirname, filepath));

test("testing artist scraping", async () => {
  const [beatles, mingus, richards, cdreview2018] = await Promise.all([
    readFileRel("./beatles.html").then((content) =>
      readArtistFromArtistPage("vol1/beatles.html", content),
    ),
    readFileRel("./mingus.html").then((content) =>
      readArtistFromArtistPage("jazz/mingus.html", content),
    ),
    readFileRel("./richards.html").then((content) =>
      readArtistFromArtistPage("avant/richards.html", content),
    ),
    readFileRel("./2018.html").then((content) =>
      readArtistFromArtistPage("cdreview/2018.html", content),
    ),
  ]);
  expect(beatles?.name).toBe("Beatles");
  expect(beatles?.bio).toMatch(/^The fact that/);
  expect(beatles?.albums).toStrictEqual(beatleAlbums);

  expect(mingus?.name).toBe("Charles Mingus");
  expect(mingus?.bio).toMatch(/^The art of double bass/);
  expect(mingus?.albums).toStrictEqual(mingusAlbums);

  expect(richards?.name).toBe("Vicki Richards");
  expect(richards?.bio).toMatch(/^Violini virtuosa/);

  expect(cdreview2018).toBeNull();
});

test("testing page readers", async () => {
  const [jazz, vol6, newReviews] = await Promise.all([
    readFileRel("./jazz.html").then(readArtistsFromJazzPage),
    readFileRel("./vol6.html").then((content) =>
      readArtistsFromVolumePage(6, content),
    ),
    readFileRel("./new.html").then(readArtistsFromNewPage),
  ]);

  Object.entries(jazz).forEach(([url]) => expect(url).toMatch(/\.html$/));
  expect(Object.keys(jazz).length).toBe(590);

  Object.entries(jazz).forEach(([url]) => expect(url).toMatch(/\.html$/));
  expect(Object.keys(vol6).length).toBeGreaterThanOrEqual(926);

  Object.entries(newReviews).forEach(([url]) =>
    expect(url).toMatch(/(avant|jazz|vol).*\.html$/),
  );
  expect(Object.keys(newReviews).length).toBeGreaterThanOrEqual(347);
});
