import axios, { AxiosRequestConfig } from "axios";
import { findInBody } from "./album";
import * as cheerio from "cheerio";

const basePath = "http://scaruffi.com";

const path = (pathname: string) => new URL(pathname, basePath).href;

const readArtistsFromPage = (
  content: string | Buffer,
  pagePath: string,
  selectionFunction: (_: cheerio.Root) => string[],
) => {
  try {
    const $ = cheerio.load(content);
    const artistElements = selectionFunction($);

    return artistElements.reduce((p, elem) => {
      const artistUrl = $(elem).attr("href");
      if (!artistUrl) {
        return p;
      }

      return {
        ...p,
        [new URL(artistUrl, path(pagePath)).pathname]: {
          name: $(elem).text().trim(),
        },
      };
    }, {}) as { [url: string]: { name: string } };
  } catch (e) {
    // TODO: Handle this
    return {};
  }
};

export const getPage = (pagePath: string, config?: AxiosRequestConfig) =>
  axios
    .get<string>(path(pagePath), {
      ...config,
      responseType: "document",
    })
    .then((resp) => ({
      lastModified: new Date(resp.headers["last-modified"] as string),
      data: resp.data,
    }));

export const getRockPage = (config?: AxiosRequestConfig) =>
  getPage("music/groups.html", config);

export const readArtistsFromRockPage = (content: string | Buffer) =>
  readArtistsFromPage(content, "music/groups.html", ($) =>
    $("table:nth-of-type(3) a").get(),
  );

export const getArtistsFromRockPage = (config?: AxiosRequestConfig) =>
  getRockPage(config).then(({ data }) => readArtistsFromRockPage(data));

export const getJazzPage = (config?: AxiosRequestConfig) =>
  getPage("jazz/musician.html", config);

export const readArtistsFromJazzPage = (content: string | Buffer) =>
  readArtistsFromPage(content, "jazz/musician.html", ($) =>
    $('[width="400"] a').get(),
  );

export const getArtistsFromJazzPage = (config?: AxiosRequestConfig) =>
  getJazzPage(config).then(({ data }) => readArtistsFromJazzPage(data));

type Volume = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const getVolumePage = (vol: Volume, config?: AxiosRequestConfig) =>
  getPage(`vol${vol}/`, config);

export const readArtistsFromVolumePage = (
  vol: Volume,
  content: string | Buffer,
) =>
  readArtistsFromPage(content, `vol${vol}/`, ($) => {
    let elems: string[] = [];
    $("select").each(
      (_, elem) =>
        (elems = [...elems, ...$(elem).children("option").slice(1).get()]),
    );
    elems.forEach((entry) => {
      const href = $(entry).attr("value");
      if (!href) {
        return;
      }

      const pathname = new URL(href, path(`vol${vol}/`)).pathname;
      $(entry).attr("href", pathname);
    });
    return elems;
  });

export const getArtistsFromVolumePage = (
  vol: Volume,
  config?: AxiosRequestConfig,
) =>
  getVolumePage(vol, config).then(({ data }) =>
    readArtistsFromVolumePage(vol, data),
  );

export const getNewPage = (config?: AxiosRequestConfig) =>
  getPage("cdreview/new.html", config);

export const readArtistsFromNewPage = (content: string | Buffer) =>
  readArtistsFromPage(content, "cdreview/new.html", ($) =>
    $("table[bgcolor=ffa000]:first td[bgcolor=000aaa] a").get(),
  );

export const getArtistsFromNewPage = (config?: AxiosRequestConfig) =>
  getNewPage(config).then(({ data }) => readArtistsFromNewPage(data));

const getNameFromBody = ($: cheerio.Root) => {
  const header = $("center h1");
  if (header.length > 0) {
    return header.text();
  }

  return $("center font").first().text();
};

const getBioFromBody = ($: cheerio.Root) => {
  let bio = "";
  if ($("table").get().length > 1) {
    const tables = $("table:nth-of-type(2) [bgcolor]").get();

    for (let k = 0; k < tables.length; k += 2) {
      const table = tables[k];

      for (let j = 0; j < $(table).contents().get().length; j++) {
        const childNode = $(table).contents().get(j);

        bio +=
          childNode.name === "br"
            ? "\n"
            : (childNode.name === "p" ? "\n\n\n" : " ") +
              ($(childNode).text() || "").trim().replace(/\n/g, " ");
      }
    }
  }
  return bio.trim();
};

const getRelatedArtistsFromBody = (
  $: cheerio.Root,
  artistUrl: string,
): string[] => {
  if ($("table").get().length <= 1) {
    return [];
  }

  const hrefs: string[] = [];
  $("table [bgcolor] a").each((_, a) => {
    const href = $(a).attr("href");
    if (!href) {
      return;
    }

    const relatedUrl = new URL(href, artistUrl);
    if (
      relatedUrl.hostname !== "scaruffi.com" ||
      !(
        relatedUrl.pathname.startsWith("/vol") ||
        relatedUrl.pathname.startsWith("/jazz")
      )
    ) {
      return;
    }

    hrefs.push(relatedUrl.pathname.substring(1));
  });

  return [...new Set(hrefs)].filter((href) => href !== artistUrl);
};

const artistUrlRegex = /(avant|jazz|vol).*\.html$/;

export const readArtistFromArtistPage = (
  artistUrl: string,
  content: string | Buffer,
) => {
  if (!artistUrlRegex.test(artistUrl)) {
    return null;
  }

  const $ = cheerio.load(content);

  return {
    name: getNameFromBody($).trim(),
    bio: getBioFromBody($).trim(),
    albums: findInBody($),
    relatedArtists: getRelatedArtistsFromBody($, path(artistUrl)),
    url: artistUrl,
  };
};

export const getArtistPage = (artistUrl: string, config?: AxiosRequestConfig) =>
  getPage(path(artistUrl), config);

export const getArtistFromPage = (
  artistUrl: string,
  config?: AxiosRequestConfig,
) =>
  getPage(path(artistUrl), config).then(({ data, lastModified }) => {
    const artist = readArtistFromArtistPage(artistUrl, data);
    if (artist) {
      return { ...artist, lastUpdate: lastModified };
    }

    return artist;
  });
