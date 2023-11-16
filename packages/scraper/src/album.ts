import { AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import { getPage, scruffyPath } from "./page";

export type ReadAlbum = {
  artistUrl: string;
  name: string;
  rating: number;
  year?: number;
  imageUrl?: string;
};

export type PageResult = {
  albums: ReadAlbum[];
  artists: Record<string, { name: string }>;
};

export const findInBody = (
  $: cheerio.Root,
): {
  name: string;
  year?: number | undefined;
  rating: number;
}[] => {
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

  return albumStrings.flatMap((str) => {
    const matchedYear = str.match(yearPattern)?.[0];
    const matchedRating = str.match(ratingPattern)?.[0];

    const name = str.match(albumNamePattern)?.[0]?.trim();
    const rating = matchedRating ? parseFloat(matchedRating) : undefined;
    if (!name || !rating) {
      return [];
    }

    return [
      {
        name,
        rating,
        year: matchedYear ? parseInt(matchedYear, 10) : undefined,
      },
    ];
  });
};

const ratingRegex = /^ *([0-9]{1,2}(\.5)?)(\/10)? *$/;

const readRatingsFromCDReview = (
  rowSelector: string,
  path: string,
  content: string | Buffer,
) => {
  const $ = cheerio.load(content);
  const rows = $(rowSelector);
  const albums: ReadAlbum[] = [];
  const artists: Record<string, { name: string }> = {};

  rows.each((_, elem) => {
    const artistLink: cheerio.TagElement = $(elem).find("td > a").get(0);
    const albumLink: cheerio.TagElement = $(elem).find("td > a").get(1);
    const ratingElem: cheerio.TagElement = $(elem)
      .find("td[bgcolor=f00000] > font")
      .get(0);

    const link = artistLink?.attribs.href ?? albumLink?.attribs.href;
    if (!link) return;

    const artistName = $(artistLink).text()?.trim();
    if (!artistName) return;

    const artistUrl = new URL(link, scruffyPath(path)).pathname;
    artists[artistUrl] = { name: artistName };

    const albumName = $(albumLink).text()?.trim();
    if (!albumName) return;

    const ratingText = $(ratingElem).text();
    if (!ratingText) return;

    const matches = ratingRegex.exec(ratingText.trim());
    const rating = parseFloat(matches?.[1] ?? "");
    if (isNaN(rating)) return;

    albums.push({
      artistUrl: artistUrl,
      name: albumName,
      rating,
    });
  });

  return { artists, albums };
};

export const getYearRatingsPage = async (
  year: number,
  client?: AxiosInstance,
) => {
  const max = new Date().getFullYear();
  if (year >= 1990 && year <= max) {
    return getPage(`cdreview/${year}.html`, client);
  }

  return null;
};

export const readAlbumsFromYearRatingsPage = (
  year: number,
  content: string | Buffer,
) => {
  const max = new Date().getFullYear();
  if (year >= 1990 && year <= max) {
    const { artists, albums } = readRatingsFromCDReview(
      year >= 2000
        ? `table[bgcolor=ffa000] > tbody > tr`
        : `table > tbody > tr`,
      `cdreview/${year}.html`,
      content,
    );
    return { artists, albums: albums.map((a) => ({ ...a, year })) };
  }

  return { albums: [], artists: {} };
};

export const getNewRatingsPage = (client?: AxiosInstance) =>
  getPage("cdreview/new.html", client);

export const readAlbumsFromNewRatingsPage = (content: string | Buffer) =>
  readRatingsFromCDReview(
    `table[bgcolor=ffa000]:first > tbody > tr`,
    "cdreview/new.html",
    content,
  );

export const getAlbumsFromNewRatingsPage = (client?: AxiosInstance) =>
  getNewRatingsPage(client).then((page) => ({
    ...page,
    ...readAlbumsFromNewRatingsPage(page.data),
  }));

// TODO: get ratings from best of all time and decades list
