import * as fs from "node:fs/promises";
import {
  readArtistFromArtistPage,
  readArtistsFromJazzPage,
  readArtistsFromVolumePage,
} from "../src/artist";
import * as path from "node:path";

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

const setYear = <T extends { year?: number | undefined }>(
  x: T,
): T & { year: number | undefined } => ({
  ...x,
  year: x.year ?? undefined,
});

const itReadsArtistPage = ({ filepath, ...rest }: ArtistReaderTestCase) =>
  it(
    rest.shouldBeNull
      ? `it does not read artist from ${filepath} page`
      : `it reads the ${filepath} page correctly`,
    async () => {
      const splitPath = filepath.split("/");
      const filename = `artist-pages/${splitPath[splitPath.length - 1]}`;

      const content = await readFileRel(filename);
      const artist = readArtistFromArtistPage(filepath, content);
      if (rest.shouldBeNull) {
        expect(artist).toBeNull();
      } else {
        expect(artist?.name).toBe(rest.name);
        expect(artist?.bio).toMatch(rest.start);
        expect(artist?.bio).toMatch(rest.end);
        expect(artist?.albums ?? []).toStrictEqual(rest.albums.map(setYear));
      }
    },
  );

describe("The readArtistFromArtistPage function", () => {
  itReadsArtistPage({
    filepath: "vol1/beatles.html",
    name: "Beatles",
    start: /^The fact that/,
    end: /they never said it\.$/,
    albums: [
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
    ],
  });

  itReadsArtistPage({
    filepath: "jazz/mingus.html",
    name: "Charles Mingus",
    start: /^The art of double bass/,
    end: /Mingus died in january 1979\.$/,
    albums: [
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
    ],
  });

  itReadsArtistPage({
    filepath: "vol1/stones.html",
    name: "Rolling Stones",
    start: /^The Rolling Stones were/,
    end: /never be the same again\.$/,
    albums: [
      { name: "Rolling Stones", rating: 5 },
      { name: "Out Of Our Heads", rating: 6 },
      { name: "Aftermath", year: 1966, rating: 7 },
      { name: "Between The Buttons", year: 1967, rating: 7.5 },
      { name: "Their Satanic Majesties Request", year: 1967, rating: 6.5 },
      { name: "Beggar's Banquet", year: 1968, rating: 7 },
      { name: "Let It Bleed", year: 1969, rating: 6.5 },
      { name: "Sticky Fingers", year: 1971, rating: 7 },
      { name: "Exile On Main Street", year: 1972, rating: 8 },
    ],
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
    albums: [
      { name: "F#A# Infinity", rating: 7 },
      { name: "Slow Riot For New Zero Kanada", rating: 6 },
      { name: "Lift Your Skinny Fists", rating: 7.5 },
      { name: "Silver Mt Zion: He Has Left Us Alone", year: 2000, rating: 7 },
      { name: "Silver Mt Zion: Born Into Trouble", year: 2001, rating: 6.5 },
      {
        name: "Set Fire To Flames: Sings Reign Rebuilder",
        year: 2001,
        rating: 6,
      },
      { name: "Molasses: You'll Never Be Well No More", year: 1999, rating: 6 },
      {
        name: "Molasses: Trilogie - Toil & Peaceful Life",
        year: 2000,
        rating: 6,
      },
      { name: "Molasses: A Slow Messe", year: 2003, rating: 6.5 },
      { name: "Yanqui UXO", year: 2002, rating: 7 },
      {
        name: "Hrsta: L'Eclat Du Ciel Etait Insoutenable",
        year: 2001,
        rating: 5,
      },
      { name: "Hrsta: Stem Stem In Electro", year: 2005, rating: 6.5 },
      {
        name: "Hrsta: Ghosts Will Come And Kiss Our Eyes",
        year: 2007,
        rating: 6,
      },
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
    ],
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
    albums: [
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
    ],
  });

  itReadsArtistPage({
    filepath: "vol2/velvet.html",
    name: "Velvet Underground",
    start: /^The Velvet Underground  are/,
    end: /'Expanded Cinema' \(november 1965\)\.$/,
    albums: [
      { name: "The Velvet Underground And Nico", year: 1967, rating: 9 },
      { name: "White Light White Heat", year: 1967, rating: 9 },
      { name: "Velvet Underground", year: 1969, rating: 6.5 },
      { name: "Live", year: 1974, rating: 8 },
      { name: "Loaded", year: 1970, rating: 6 },
      { name: "Squeeze", year: 1973, rating: 4 },
    ],
  });

  itReadsArtistPage({
    filepath: "jazz/ayler.html",
    name: "Albert Ayler",
    start: /^Of all the protagonists/,
    end: /"Holy Ghost" \(2022\)\.$/,
    albums: [
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
    ],
  });

  itReadsArtistPage({
    filepath: "vol3/deuter.html",
    name: "Georg Deuter",
    start: /^Georg Georg Deuter/,
    end: /english\.$/,
    albums: [
      { name: "D", rating: 7 },
      { name: "Aum", rating: 7 },
      { name: "Basho's Pond", rating: 5 },
      { name: "Tea From An Empty Cup", rating: 5 },
      { name: "San", rating: 6 },
      { name: "Buddham Sharnam Gachchami", rating: 5 },
      { name: "Flowers Of Silence", rating: 5 },
      { name: "Sambodhi Music", rating: 6 },
      { name: "Celebration", rating: 6 },
      { name: "Haleakala Mystery", rating: 7 },
      { name: "Ecstasy", rating: 7 },
      { name: "Silence Is The Answer", rating: 8 },
      { name: "Cicada", rating: 6 },
      { name: "Nirvana Road", rating: 7 },
      { name: "Land Of Enchantment", rating: 6 },
      { name: "Henon", rating: 5 },
      { name: "Terra Magica: Planet Of Light", rating: 5 },
      { name: "Wind & Mountain", rating: 4 },
      { name: "Kundalini", rating: 4 },
      { name: "Nadabrahma", rating: 4 },
      { name: "Nada Himalaya", rating: 5 },
      { name: "Reiki", rating: 4 },
      { name: "Sun Spirit", rating: 4 },
      { name: "Garden of the Gods", rating: 4 },
      { name: "Buddha Nature", rating: 4 },
    ],
  });

  itReadsArtistPage({
    filepath: "vol5/fishbone.html",
    name: "Fishbone",
    start: /^A mild and satirical approach/,
    end: /sounds terribly outdated\.$/,
    albums: [
      { name: "Fishbone", rating: 7.5 },
      { name: "In Your Face", rating: 6 },
      { name: "It's A Wonderful Life", rating: 7 },
      { name: "Truth And Soul", rating: 7 },
      { name: "Reality Of My Surroundings", rating: 7.5 },
      { name: "Give A Monkey A Brain", rating: 5 },
      { name: "Chim Chim's Badass Revenge", rating: 5 },
      { name: "The Psychotic Friends Nuttwerx", rating: 4 },
    ],
  });

  itReadsArtistPage({
    filepath: "vol6/sainteti.html",
    name: "Saint Etienne",
    start: /^"Retro futurism" was pioneered by/,
    end: /and breezy rhythms\.$/,
    albums: [
      { name: "Foxbase Alpha", rating: 7 },
      { name: "So Tough", rating: 7 },
      { name: "Tiger Bay", rating: 6.5 },
      { name: "Sarah Cracknell: Lipslide", rating: 5 },
      { name: "Good Humour", rating: 5 },
      { name: "Fairfax", rating: 5 },
      { name: "Places To Visit", rating: 5 },
      { name: "The Misadventures Of Saint Etienne", rating: 5 },
      { name: "Sound Of Water", rating: 6 },
      { name: "Interlude", rating: 5 },
      { name: "Finisterre", rating: 5.5 },
      { name: "Tales from Turnpike House", rating: 6, year: 2005 },
      { name: "Words & Music", rating: 6, year: 2012 },
    ],
  });

  itReadsArtistPage({
    filepath: "vol5/juneof44.html",
    name: "June of 44",
    start: /^June Of 44, a sort of supergroup/,
    end: /whispered by the singer\.$/,
    albums: [
      { name: "Engine Takes To The Water", rating: 7 },
      { name: "Tropics And Meridians", rating: 7.5 },
      { name: "Anatomy Of Sharks", rating: 6.5 },
      { name: "Four Great Points", rating: 8 },
      { name: "Anahata", rating: 6.5 },
      { name: "In The Fishtank", rating: 5 },
      {
        name: "Everlasting The Way: Long Stretch Motorcycle Hymn Highway",
        rating: 5,
      },
    ],
  });

  itReadsArtistPage({
    filepath: "vol5/blacktap.html",
    name: "Black Tape For A Blue Girl",
    start: /^Gothic music was virtually reinvented/,
    end: /unfortunately rather uneventful\.$/,
    albums: [
      { name: "Rope", rating: 6.5, year: 1986 },
      {
        name: "Sam Rosenthal: Before The Buildings Fell",
        rating: 5,
        year: 1986,
      },
      { name: "Mesmerized By The Sirens", rating: 6, year: 1987 },
      { name: "Ashes In The Brittle Air", rating: 6, year: 1989 },
      { name: "A Chaos Of Desire", rating: 7.5 },
      { name: "Terrace Of Memories", rating: 6 },
      { name: "This Lush Garden Within", rating: 6.5 },
      { name: "The First Pain To Linger", rating: 6 },
      { name: "Remnants Of A Deeper Purity", rating: 8.5 },
      { name: "As One Aflame Laid Bare By Desire", rating: 7.5 },
      { name: "The Scavenger Bride", rating: 7 },
      { name: "Halo Star", rating: 4, year: 2004 },
      { name: "10 Neurotics", rating: 5, year: 2009 },
      { name: "Pod", rating: 4.5, year: 2007 },
      { name: "These Fleeting Moments", rating: 6, year: 2016 },
      { name: "To Touch The Milky Way", rating: 5.5, year: 2018 },
      { name: "The Cleft Serpent", rating: 4, year: 2021 },
    ],
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
    const content = await readFileRel(`list-pages/${filePath}`);
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
