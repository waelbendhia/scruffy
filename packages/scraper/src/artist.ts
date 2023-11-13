import axios, { AxiosRequestConfig } from "axios";
import * as crypto from "crypto";
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

export const getPage = async (
  pagePath: string,
  config?: AxiosRequestConfig,
) => {
  const resp = await axios.get<string>(path(pagePath), {
    ...config,
    responseType: "document",
  });

  return {
    url: pagePath,
    lastModified: new Date(resp.headers["last-modified"] as string),
    data: resp.data,
    hash: crypto.createHash("md5").update(resp.data).digest("hex"),
  };
};

type PageReader = (content: string | Buffer) => {
  [url: string]: {
    name: string;
  };
};

const getAndRead = async (
  pageURL: string,
  reader: PageReader,
  config?: AxiosRequestConfig,
) => {
  const { data, ...page } = await getPage(pageURL, config);
  const artists = reader(data);
  return { ...page, artists };
};

/** This is the page with supposedly all artists ever reviewed, should include
 * volums 1-9 and Avant.
 */
export const getRockPage = (config?: AxiosRequestConfig) =>
  getPage("music/groups.html", config);

/** Parses artists from the music/groups.html page */
export const readArtistsFromRockPage = (content: string | Buffer) =>
  readArtistsFromPage(content, "music/groups.html", ($) =>
    $("table:nth-of-type(3) a").get(),
  );

/** Loads and parses artists from the music/groups.html page */
export const getArtistsFromRockPage = (config?: AxiosRequestConfig) =>
  getAndRead("music/groups.html", readArtistsFromRockPage, config);

/** This is the page with all Jazz artists ever reviewed. */
export const getJazzPage = (config?: AxiosRequestConfig) =>
  getPage("jazz/musician.html", config);

/** Parses artists from the jazz/musician.html page */
export const readArtistsFromJazzPage = (content: string | Buffer) =>
  readArtistsFromPage(content, "jazz/musician.html", ($) =>
    $('[width="400"] a').get(),
  );

/** Loads and parses artists from the jazz/musician.html page */
export const getArtistsFromJazzPage = (config?: AxiosRequestConfig) =>
  getAndRead("jazz/musician.html", readArtistsFromJazzPage, config);

type Volume = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** This is the page with all artists ever reviewed in a specific volume. */
export const getVolumePage = (vol: Volume, config?: AxiosRequestConfig) =>
  getPage(`vol${vol}/`, config);

/** Parses artists from the vol{vol} page */
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

/** Loads and parses artists from the vol{vol} page */
export const getArtistsFromVolumePage = (
  vol: Volume,
  config?: AxiosRequestConfig,
) =>
  getAndRead(
    `vol${vol}/`,
    (data) => readArtistsFromVolumePage(vol, data),
    config,
  );

/** This is the page with new reviews */
export const getNewPage = (config?: AxiosRequestConfig) =>
  getPage("cdreview/new.html", config);

/** Parses artists from the cdreview/new.html page */
export const readArtistsFromNewPage = (content: string | Buffer) =>
  readArtistsFromPage(content, "cdreview/new.html", ($) =>
    $("table[bgcolor=ffa000]:first td[bgcolor=000aaa] a").get(),
  );

/** Loads and parses artists from the cdreview/new.html page */
export const getArtistsFromNewPage = (config?: AxiosRequestConfig) =>
  getAndRead("cdreview/new.html", readArtistsFromNewPage, config);

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

    try {
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
    } catch (e) {
      return;
    }
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
  getPage(path(artistUrl), config).then((page) => {
    const artist = readArtistFromArtistPage(artistUrl, page.data);
    if (artist) {
      return { ...artist, lastModified: page.lastModified, hash: page.hash };
    }

    return artist;
  });
