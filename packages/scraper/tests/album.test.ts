import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  ReadAlbum,
  readAlbumsFromNewRatingsPage,
  readAlbumsFromYearRatingsPage,
} from "../src/album";

const readFileRel = (filepath: string) =>
  fs.readFile(path.resolve(__dirname, filepath));

type ReadResult = ReturnType<typeof readAlbumsFromNewRatingsPage>;

type RatingPageTestCase = {
  filepath: string;
  reader: (_: string | Buffer) => ReadResult;
  length: number;
  shouldInclude: ReadAlbum[];
  artistsShouldInclude: string[];
  artistLength: number;
};

const itShouldReadAlbumsFromRatingPage = ({
  filepath,
  reader,
  length,
  shouldInclude,
  artistsShouldInclude,
  artistLength,
}: RatingPageTestCase) =>
  it(`should read albums from ${filepath}`, async () => {
    const content = await readFileRel(`list-pages/${filepath}`);
    const { artists, albums } = reader(content);

    expect(albums.length).toBe(length);
    shouldInclude.forEach((album) => expect(albums).toContainEqual(album));

    expect(Object.keys(artists).length).toBe(artistLength);
    artistsShouldInclude.forEach((url) =>
      expect(artists[url]).not.toBeUndefined(),
    );
  });

describe("Rating Page readers", () => {
  itShouldReadAlbumsFromRatingPage({
    filepath: "new.html",
    reader: readAlbumsFromNewRatingsPage,
    length: 581,
    shouldInclude: [
      {
        artistUrl: "/vol7/goteam.html",
        name: "Get Up Sequences Part One",
        rating: 4,
      },
      {
        artistUrl: "/jazz/leppin.html",
        name: "Ensemble Volcanic Ash",
        rating: 6.5,
      },
      {
        artistUrl: "/vol8/youroldd.html",
        name: "Krutoy Edition",
        rating: 7,
      },
    ],
    artistLength: 347,
    artistsShouldInclude: [
      "/vol4/grazhdan.html",
      "/vol6/behemoth.html",
      "/vol6/porcupin.html",
      "/vol8/bloodont.html",
      "/vol8/estrada.html",
      "/vol8/io.html",
    ],
  });

  itShouldReadAlbumsFromRatingPage({
    filepath: "2018.html",
    reader: (content) => readAlbumsFromYearRatingsPage(2018, content),
    length: 163,
    shouldInclude: [
      {
        artistUrl: "/vol8/1975.html",
        name: "A Brief Inquiry Into Online Relationships",
        rating: 6,
        year: 2018,
      },
      {
        artistUrl: "/vol7/kurushim.html",
        name: "What is Chaos",
        rating: 7,
        year: 2018,
      },
      {
        artistUrl: "/vol8/zealardo.html",
        name: "Stranger Fruit",
        rating: 6,
        year: 2018,
      },
    ],
    artistLength: 149,
    artistsShouldInclude: [
      "/avant/castillo.html",
      "/vol8/brockham.html",
      "/vol8/zealardo.html",
    ],
  });

  itShouldReadAlbumsFromRatingPage({
    filepath: "2000.html",
    reader: (content) => readAlbumsFromYearRatingsPage(2000, content),
    length: 687,
    shouldInclude: [
      {
        artistUrl: "/vol6/guycalle.html",
        name: "Essence",
        rating: 5,
        year: 2000,
      },
      {
        artistUrl: "/vol5/leatherf.html",
        name: "Horsebox",
        rating: 5,
        year: 2000,
      },
      {
        artistUrl: "/vol4/zoviet.html",
        name: "Decriminalization",
        rating: 5,
        year: 2000,
      },
    ],
    artistLength: 620,
    artistsShouldInclude: [
      "/avant/bone.html",
      "/vol5/redredme.html",
      "/vol8/ayreon.html",
    ],
  });

  itShouldReadAlbumsFromRatingPage({
    filepath: "1990.html",
    reader: (content) => readAlbumsFromYearRatingsPage(1990, content),
    length: 457,
    shouldInclude: [
      {
        artistUrl: "/vol6/guycalle.html",
        name: "Automanikk",
        rating: 6,
        year: 1990,
      },
      {
        artistUrl: "/vol5/antbee.html",
        name: "Pure Electric Honey",
        rating: 8,
        year: 1990,
      },
      {
        artistUrl: "/vol4/zoviet.html",
        name: "Look Into Me",
        rating: 4,
        year: 1990,
      },
    ],
    artistLength: 427,
    artistsShouldInclude: [
      "/avant/borden.html",
      "/vol2/santana.html",
      "/vol5/afghanwi.html",
    ],
  });
});
