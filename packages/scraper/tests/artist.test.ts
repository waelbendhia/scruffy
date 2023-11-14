import * as fs from "node:fs/promises";
import {
  readArtistFromArtistPage,
  readArtistsFromJazzPage,
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
  { name: "Sgt Pepper's Lonely Hearts Club Band", year: 1967, rating: 7 },
  { name: "Magical Mystery Tour", year: 1967, rating: 6 },
  { name: "The Beatles", year: 1968, rating: 6 },
  { name: "Yellow Submarine", year: 1969, rating: 5 },
  { name: "Abbey Road", year: 1969, rating: 7 },
  { name: "Let It Be", year: 1970, rating: 4 },
  { name: "George Harrison: Wonderwall", year: 1968, rating: 5 },
  { name: "George Harrison: Electronic Sounds", year: 1969, rating: 6 },
  { name: "George Harrison: All Things Must Pass", year: 1970, rating: 6.5 },
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

const aylerAlbums = [
  { name: "Holy Ghost", year: 1962, rating: 5 },
  { name: "Something Different", year: 1962, rating: 6 },
  { name: "My Name is Albert Ayler", year: 1963, rating: 5 },
  { name: "Spirits/Witches and Devils", year: 1964, rating: 7.5 },
  { name: "Swing Low Sweet Spiritual", year: 1964, rating: 5 },
  { name: "Prophecy", year: 1964, rating: 6 },
  { name: "Spiritual Unity", year: 1964, rating: 9 },
  { name: "New York Eye and Ear Control", year: 1946, rating: 7.5 },
  { name: "Vibrations", year: 1964, rating: 7.5 },
  { name: "The Hilversum Session", year: 1964, rating: 6 },
  { name: "Bells", year: 1965, rating: 6 },
  { name: "Spirits Rejoice", year: 1965, rating: 6 },
  { name: "In Greenwich Village", year: 1966, rating: 4 },
  { name: "Holy Ghost", year: 1967, rating: 5 },
  { name: "Love Cry", year: 1967, rating: 4 },
  {
    name: "Music is the Healing Force of the Universe",
    year: 1969,
    rating: 5.5,
  },
];

const deuterAlbums = [
  { name: "D", rating: 7, year: undefined },
  { name: "Aum", rating: 7, year: undefined },
  { name: "Basho's Pond", rating: 5, year: undefined },
  { name: "Tea From An Empty Cup", rating: 5, year: undefined },
  { name: "San", rating: 6, year: undefined },
  { name: "Buddham Sharnam Gachchami", rating: 5, year: undefined },
  { name: "Flowers Of Silence", rating: 5, year: undefined },
  { name: "Sambodhi Music", rating: 6, year: undefined },
  { name: "Celebration", rating: 6, year: undefined },
  { name: "Haleakala Mystery", rating: 7, year: undefined },
  { name: "Ecstasy", rating: 7, year: undefined },
  { name: "Silence Is The Answer", rating: 8, year: undefined },
  { name: "Cicada", rating: 6, year: undefined },
  { name: "Nirvana Road", rating: 7, year: undefined },
  { name: "Land Of Enchantment", rating: 6, year: undefined },
  { name: "Henon", rating: 5, year: undefined },
  { name: "Terra Magica: Planet Of Light", rating: 5, year: undefined },
  { name: "Wind & Mountain", rating: 4, year: undefined },
  { name: "Kundalini", rating: 4, year: undefined },
  { name: "Nadabrahma", rating: 4, year: undefined },
  { name: "Nada Himalaya", rating: 5, year: undefined },
  { name: "Reiki", rating: 4, year: undefined },
  { name: "Sun Spirit", rating: 4, year: undefined },
  { name: "Garden of the Gods", rating: 4, year: undefined },
  { name: "Buddha Nature", rating: 4, year: undefined },
];

const readFileRel = (filepath: string) =>
  fs.readFile(path.resolve(__dirname, filepath));

type ArtistReaderTestCase = {
  filepath: string;
} & (
  | {
      shouldBeNull?: false;
      albums: { name: string; year?: number; rating: number }[];
      start: RegExp;
      end: RegExp;
      name: string;
    }
  | { shouldBeNull: true }
);

const itReadsArtistPage = ({ filepath, ...rest }: ArtistReaderTestCase) =>
  it(
    rest.shouldBeNull
      ? `it does not read artist from ${filepath} page`
      : `it reads the ${filepath} page correctly`,
    async () => {
      const splitPath = filepath.split("/");
      const filename = splitPath[splitPath.length - 1];

      const content = await readFileRel(filename);
      const artist = readArtistFromArtistPage(filepath, content);
      if (rest.shouldBeNull) {
        expect(artist).toBeNull();
      } else {
        expect(artist?.name).toBe(rest.name);
        expect(artist?.bio).toMatch(rest.start);
        expect(artist?.bio).toMatch(rest.end);
        expect(artist?.albums ?? []).toStrictEqual(rest.albums);
      }
    },
  );

describe("The readArtistFromArtistPage function", () => {
  itReadsArtistPage({
    filepath: "vol1/beatles.html",
    name: "Beatles",
    start: /^The fact that/,
    end: /they never said it\.$/,
    albums: beatleAlbums,
  });

  itReadsArtistPage({
    filepath: "jazz/mingus.html",
    name: "Charles Mingus",
    start: /^The art of double bass/,
    end: /Mingus died in january 1979\.$/,
    albums: mingusAlbums,
  });

  itReadsArtistPage({
    filepath: "vol1/stones.html",
    name: "Rolling Stones",
    start: /^The Rolling Stones were/,
    end: /never be the same again\.$/,
    albums: stonesAlbums,
  });

  itReadsArtistPage({
    filepath: "avant/richards.html",
    name: "Vicki Richards",
    start: /^Violini virtuosa/,
    end: /with Amit Chatterjee\.$/,
    albums: [],
  });

  itReadsArtistPage({
    filepath: "vol6/godspeed.html",
    name: "Godspeed You! Black Emperor",
    start: /^Godspeed You! Black Emperor, a large/,
    end: /music\.$/,
    albums: gsybeAlbums,
  });

  itReadsArtistPage({
    filepath: "vol8/100gecs.html",
    name: "100 Gecs",
    start: /^Missouri's duo 100 Gecs/,
    end: /with Josh Pan\.$/,
    albums: [],
  });

  itReadsArtistPage({
    filepath: "vol2/softmach.html",
    name: "Soft Machine",
    start: /^The Canterbury school of British/,
    end: /and Live Adventures \(october 2009\)\.$/,
    albums: softMachineAlbums,
  });

  itReadsArtistPage({
    filepath: "vol2/velvet.html",
    name: "Velvet Underground",
    start: /^The Velvet Underground  are/,
    end: /'Expanded Cinema' \(november 1965\)\.$/,
    albums: velvetAlbums,
  });

  itReadsArtistPage({
    filepath: "jazz/ayler.html",
    name: "Albert Ayler",
    start: /^Of all the protagonists/,
    end: /"Holy Ghost" \(2022\)\.$/,
    albums: aylerAlbums,
  });

  itReadsArtistPage({
    filepath: "vol3/deuter.html",
    name: "Georg Deuter",
    start: /^Georg Georg Deuter/,
    end: /english\.$/,
    albums: deuterAlbums,
  });

  itReadsArtistPage({ filepath: "cdreview/2018.html", shouldBeNull: true });
});

const itReadsArtistsFromPage = async ({
  reader,
  numArtists,
  shouldInclude,
  filePath,
}: {
  reader: (_: string | Buffer) => Record<string, { name: string }>;
  numArtists: number;
  shouldInclude: Record<string, { name: string }>;
  filePath: string;
}) =>
  it(`should read artists from ${filePath}`, async () => {
    const content = await readFileRel(filePath);
    const artists = reader(content);
    const entries = Object.entries(artists);

    entries.forEach(([url]) =>
      expect(url).toMatch(/(avant|jazz|vol).*\.html$/),
    );
    entries.forEach(([url]) => expect(url).toMatch(/\.html$/));

    expect(entries.length).toBe(numArtists);

    const expected = Object.entries(shouldInclude);
    expected.forEach(([url, { name }]) => {
      expect(artists[url]?.name).toBe(name);
    });
  });

describe("Page readers", () => {
  itReadsArtistsFromPage({
    filePath: "./jazz.html",
    reader: readArtistsFromJazzPage,
    numArtists: 590,
    shouldInclude: {
      "/avant/zummo.html": { name: "Peter Zummo" },
      "/jazz/leandre.html": { name: "Joelle Leandre" },
      "/jazz/abe.html": { name: "Kaoru Abe" },
    },
  });

  itReadsArtistsFromPage({
    filePath: "./vol6.html",
    reader: (content) => readArtistsFromVolumePage(6, content),
    numArtists: 961,
    shouldInclude: {
      "/vol6/zumpano.html": { name: "Zumpano" },
      "/vol6/lescrawl.html": { name: "Le Scrawl" },
      "/vol6/guycalle.html": { name: "A Guy Called Gerald" },
    },
  });
});
