import axios, { AxiosRequestConfig } from "axios";
import * as cheerio from "cheerio";

export type Album = {
  name: string;
  year?: number;
  rating?: number;
};

type MakeKeyNotNull<O extends object, Key extends keyof O> = {
  [k in keyof O]: k extends Key ? Exclude<O[k], undefined | null> : O[k];
};

export const findInBody = ($: cheerio.Root) => {
  if ($("table").get().length === 0) {
    return [];
  }

  const albumPattern = /.+,{0,1} ([0-9]*.[0-9]+|[0-9]+)\/10/g;
  const albumsText = $("table:first td:nth-of-type(1)").text();
  const albumStrings = albumsText.match(albumPattern);

  if (!albumStrings) {
    return [];
  }

  const albumNamePattern = /(^.+)(?=[(].*[)])|(^.+)(?=,)/;
  const yearPattern = /[0-9]{4}(?=\))/;
  const ratingPattern = /(([0-9].[0-9])|[0-9])(?=\/10)/;

  return albumStrings
    .map((str) => {
      const matchedYear = str.match(yearPattern)?.[0];
      const matchedRating = str.match(ratingPattern)?.[0];

      return {
        name: str.match(albumNamePattern)?.[0]?.trim(),
        year: matchedYear ? parseInt(matchedYear, 10) : undefined,
        rating: matchedRating ? parseFloat(matchedRating) : undefined,
      };
    })
    .filter(
      (a): a is MakeKeyNotNull<typeof a, "name" | "rating"> =>
        a.name !== undefined && a.rating !== undefined,
    );
};

const getBestAllTimeDates = async (config?: AxiosRequestConfig) => {
  const $ = await axios
    .get("http://scaruffi.com/music/picbest.html", config)
    .then((resp) => cheerio.load(resp.data));

  const yearPattern = /[0-9]{4}(?=\.)/;
  const albumNamePattern = /: .*/;
  const linerElements = $(
    "center:nth-of-type(1) table:nth-of-type(1) tr",
  ).get();

  return linerElements.map((linerElement) => {
    const bandAndAlbumName = $(linerElement)
      .children("td")
      .eq(0)
      .children("font")
      .eq(0)
      .children("b")
      .eq(0);
    const linerNotes = $(linerElement).children("td").eq(1).text();

    const matchedYear = linerNotes.match(yearPattern)?.[0];

    return {
      year: matchedYear ? parseInt(matchedYear, 10) : 0,
      name: bandAndAlbumName
        .text()
        ?.replace(/[\r\n]+/g, " ")
        ?.match(albumNamePattern)?.[0]
        ?.substring(2),
      band: {
        name: bandAndAlbumName.children("a").eq(0).text(),
        url: bandAndAlbumName.children("a").attr("href")?.substring(3) ?? "",
      },
    };
  });
};

const scrape = ($: cheerio.Root, elements: string[]) => {
  const yearRX = /[0-9]{4}(?=[)])/;
  const bandRX = /.*(?=:)/;
  const albmRX = /: .*(?=[(])/;

  return elements
    .map((elem) => $(elem).children("li").get())
    .map((albumElements) =>
      albumElements
        .map((albumElement) => {
          const bandAlbumName = ($(albumElement).text() || "").replace(
            /[\r\n]+/g,
            " ",
          );
          const matchedYear = bandAlbumName.match(yearRX)?.[0];

          return {
            name: bandAlbumName.match(albmRX)?.[0]?.substring(2),
            year: matchedYear ? parseInt(matchedYear, 10) : undefined,
            band: {
              name: bandAlbumName.match(bandRX)?.[0],
              url: ($(albumElement).children("a").get().length > 0
                ? $(albumElement)
                    .children("a")
                    .eq(0)
                    .attr("href")
                    ?.substring(3) ?? ""
                : ""
              ).split("#")[0],
            },
          };
        })
        .filter(({ name }) => name !== undefined),
    )
    .reduce((p, c) => [...p, ...c], []);
};

const getBestOfDecadeDates = async (
  decade: number,
  config?: AxiosRequestConfig,
) => {
  const $ = await axios
    .get(
      `http://scaruffi.com/ratings/${decade < 10 ? "00" : decade}.html`,
      config,
    )
    .then((resp) => cheerio.load(resp.data));

  return !$("center").get(0)
    ? []
    : scrape(
        $,
        $("center")
          .eq(0)
          .children("table")
          .eq(decade === 0 || decade === 10 ? 3 : 2)
          .children("tbody")
          .eq(0)
          .children("tr")
          .eq(0)
          .children("td")
          .eq(0)
          .children("ul")
          .get(),
      );
};

export const getAllDatesFromScaruffiTopLists = async (
  config: AxiosRequestConfig,
) => [
  ...(await getBestAllTimeDates(config)),
  ...(await getBestOfDecadeDates(60, config)),
  ...(await getBestOfDecadeDates(70, config)),
  ...(await getBestOfDecadeDates(80, config)),
  ...(await getBestOfDecadeDates(90, config)),
  ...(await getBestOfDecadeDates(0, config)),
  ...(await getBestOfDecadeDates(10, config)),
];
