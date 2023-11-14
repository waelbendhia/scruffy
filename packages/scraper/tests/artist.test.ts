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

const stonesAlbums = [
  { name: "Rolling Stones", rating: 5, year: undefined },
  { name: "Out Of Our Heads", rating: 6, year: undefined },
  { name: "Aftermath", year: 1966, rating: 7 },
  { name: "Between The Buttons", year: 1967, rating: 7.5 },
  { name: "Their Satanic Majesties Request", year: 1967, rating: 6.5 },
  { name: "Beggar's Banquet", year: 1968, rating: 7 },
  { name: "Let It Bleed", year: 1969, rating: 6.5 },
  { name: "Sticky Fingers", year: 1971, rating: 7 },
  { name: "Exile On Main Street", year: 1972, rating: 8 },
];

const gsybeAlbums = [
  { name: "F#A# Infinity", year: undefined, rating: 7 },
  { name: "Slow Riot For New Zero Kanada", year: undefined, rating: 6 },
  { name: "Lift Your Skinny Fists", year: undefined, rating: 7.5 },
  { name: "Silver Mt Zion: He Has Left Us Alone", year: 2000, rating: 7 },
  { name: "Silver Mt Zion: Born Into Trouble", year: 2001, rating: 6.5 },
  { name: "Set Fire To Flames: Sings Reign Rebuilder", year: 2001, rating: 6 },
  { name: "Molasses: You'll Never Be Well No More", year: 1999, rating: 6 },
  { name: "Molasses: Trilogie - Toil & Peaceful Life", year: 2000, rating: 6 },
  { name: "Molasses: A Slow Messe", year: 2003, rating: 6.5 },
  { name: "Yanqui UXO", year: 2002, rating: 7 },
  { name: "Hrsta: L'Eclat Du Ciel Etait Insoutenable", year: 2001, rating: 5 },
  { name: "Hrsta: Stem Stem In Electro", year: 2005, rating: 6.5 },
  { name: "Hrsta: Ghosts Will Come And Kiss Our Eyes", year: 2007, rating: 6 },
  {
    name: "Set Fire To Flames: Telegraphs In Negative",
    year: 2003,
    rating: 6,
  },
  { name: "Silver Mt Zion: This Is Our Punk", year: 2003, rating: 5.5 },
  { name: "Silver Mt Zion: Horses In The Sky", year: 2005, rating: 6 },
  {
    name: "Silver Mt Zion: 13 Blues for Thirteen Moons",
    year: 2008,
    rating: 5,
  },
  { name: "Silver Mt Zion: Kollaps Tradixionales", year: 2010, rating: 5 },
  { name: "Allelujah Don't Bend Ascend", year: 2012, rating: 7 },
  {
    name: "Silver Mt Zion: Fuck Off Get Free We Pour Light on Everything",
    year: 2014,
    rating: 6.5,
  },
  { name: "Asunder, Sweet And Other Distress", year: 2015, rating: 6 },
  { name: "Luciferian Towers", year: 2017, rating: 5.5 },
  { name: "G_d's Pee at State's End", year: 2021, rating: 6 },
];

const softMachineAlbums = [
  { name: "1", year: 1968, rating: 6.5 },
  { name: "2", year: 1969, rating: 7 },
  { name: "Spaced", year: 1969, rating: 6.5 },
  { name: "3", year: 1970, rating: 9 },
  { name: "4", year: 1971, rating: 7 },
  { name: "5", year: 1972, rating: 6 },
  { name: "6", year: 1972, rating: 7.5 },
  { name: "7", year: 1973, rating: 5 },
  { name: "Bundles", year: 1975, rating: 6 },
  { name: "Softs", year: 1976, rating: 5 },
  { name: "Rubber Riff", year: 1978, rating: 5 },
  { name: "Land of Cockayne", year: 1981, rating: 5 },
];

const velvetAlbums = [
  { name: "The Velvet Underground And Nico", year: 1967, rating: 9 },
  { name: "White Light White Heat", year: 1967, rating: 9 },
  { name: "Velvet Underground", year: 1969, rating: 6.5 },
  { name: "Live", year: 1974, rating: 8 },
  { name: "Loaded", year: 1970, rating: 6 },
  { name: "Squeeze", year: 1973, rating: 4 },
];

const readFileRel = (filepath: string) =>
  fs.readFile(path.resolve(__dirname, filepath));

test("testing artist scraping", async () => {
  const [
    beatles,
    mingus,
    stones,
    richards,
    gecs,
    gsybe,
    softMachine,
    velvet,
    cdreview2018,
  ] = await Promise.all([
    readFileRel("./beatles.html").then((content) =>
      readArtistFromArtistPage("vol1/beatles.html", content),
    ),
    readFileRel("./mingus.html").then((content) =>
      readArtistFromArtistPage("jazz/mingus.html", content),
    ),
    readFileRel("./stones.html").then((content) =>
      readArtistFromArtistPage("vol1/stones.html", content),
    ),
    readFileRel("./richards.html").then((content) =>
      readArtistFromArtistPage("avant/richards.html", content),
    ),
    readFileRel("./100gecs.html").then((content) =>
      readArtistFromArtistPage("vol8/100gecs.html", content),
    ),
    readFileRel("./godspeed.html").then((content) =>
      readArtistFromArtistPage("vol6/godspeed.html", content),
    ),
    readFileRel("./softmach.html").then((content) =>
      readArtistFromArtistPage("vol2/softmach.html", content),
    ),
    readFileRel("./velvet.html").then((content) =>
      readArtistFromArtistPage("vol2/velvet.html", content),
    ),
    readFileRel("./2018.html").then((content) =>
      readArtistFromArtistPage("cdreview/2018.html", content),
    ),
  ]);
  expect(beatles?.name).toBe("Beatles");
  expect(beatles?.bio).toMatch(/^The fact that/);
  expect(beatles?.bio).toMatch(/they never said it\.$/);
  expect(beatles?.albums).toStrictEqual(beatleAlbums);

  expect(mingus?.name).toBe("Charles Mingus");
  expect(mingus?.bio).toMatch(/^The art of double bass/);
  expect(mingus?.bio).toMatch(/Mingus died in january 1979\.$/);
  expect(mingus?.albums).toStrictEqual(mingusAlbums);

  expect(stones?.name).toBe("Rolling Stones");
  expect(stones?.bio).toMatch(/^The Rolling Stones were/);
  expect(stones?.bio).toMatch(/never be the same again\.$/);
  expect(stones?.albums).toStrictEqual(stonesAlbums);

  expect(richards?.name).toBe("Vicki Richards");
  expect(richards?.bio).toMatch(/^Violini virtuosa/);
  expect(richards?.bio).toMatch(/with Amit Chatterjee\.$/);
  expect(richards?.albums ?? []).toStrictEqual([]);

  expect(gsybe?.name).toBe("Godspeed You! Black Emperor");
  expect(gsybe?.bio).toMatch(/^Godspeed You! Black Emperor, a large/);
  expect(gsybe?.bio).toMatch(/music\.$/);
  expect(gsybe?.albums).toStrictEqual(gsybeAlbums);

  expect(gecs?.name).toBe("100 Gecs");
  expect(gecs?.bio).toMatch(/^Missouri's duo 100 Gecs/);
  expect(gecs?.bio).toMatch(/with Josh Pan\.$/);
  expect(gecs?.albums ?? []).toStrictEqual([]);

  expect(softMachine?.name).toBe("Soft Machine");
  expect(softMachine?.bio).toMatch(/^The Canterbury school of British/);
  expect(softMachine?.bio).toMatch(/and Live Adventures \(october 2009\)\.$/);
  expect(softMachine?.albums).toStrictEqual(softMachineAlbums);

  expect(velvet?.name).toBe("Velvet Underground");
  expect(velvet?.bio).toMatch(/^The Velvet Underground  are/);
  expect(velvet?.bio).toMatch(/'Expanded Cinema' \(november 1965\)\.$/);
  expect(velvet?.albums).toStrictEqual(velvetAlbums);

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
