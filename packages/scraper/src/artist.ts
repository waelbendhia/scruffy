import { AxiosRequestConfig } from "axios";
import { findInBody } from "./album";
import * as cheerio from "cheerio";
import { getPage, scruffyPath } from "./page";

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
      const pathname = new URL(artistUrl, scruffyPath(pagePath)).pathname;
      if (!/\.html$/.test(pathname)) {
        return p;
      }

      return {
        ...p,
        [pathname]: {
          name: $(elem).text().trim(),
        },
      };
    }, {}) as { [url: string]: { name: string } };
  } catch (e) {
    // TODO: Handle this
    return {};
  }
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
    $('[width="400"] a[HREF]').get(),
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

      const pathname = new URL(href, scruffyPath(`vol${vol}/`)).pathname;
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

const getNameFromBody = ($: cheerio.Root) => {
  const header = $("center h1");
  if (header.length > 0) {
    return header.text();
  }

  return $("center font").first().text();
};

const flattenElement = (
  e: cheerio.Element,
): (cheerio.TextElement | cheerio.TagElement)[] => {
  switch (e.type) {
    case "text":
      return [e];
    case "tag":
      return e.children.reduce<(cheerio.TextElement | cheerio.TagElement)[]>(
        (prev, e) => {
          switch (e.type) {
            case "text":
              return [...prev, e];
            case "tag":
              switch (e.tagName) {
                case "center":
                  if (
                    e.children.find(
                      (c) =>
                        c.type === "tag" &&
                        c.tagName === "font" &&
                        c.attribs.size === "-1",
                    )
                  ) {
                    return prev;
                  }

                  return [...prev, ...e.children.flatMap(flattenElement)];
                case "td":
                  return [...prev, ...e.children.flatMap(flattenElement)];
                default:
                  return [...prev, e];
              }
            default:
              return prev;
          }
        },
        [],
      );
    default:
      return [];
  }
};

const skippables = ["Summary.", "Summary", "Summary:"];

const skipSummary = (t: string) => {
  const skipIndex = Math.max(
    ...skippables
      .map((s) => ({ skippable: s, start: t.indexOf(s) }))
      .filter((s) => s.start !== -1)
      .map((s) => s.start + s.skippable.length),
  );
  if (skipIndex > 0) {
    return t.substring(skipIndex);
  }
  return t;
};

const getBioElementsByColor = ($: cheerio.Root): cheerio.Element[] => {
  for (const color of ["eebb88", "#eebb88", "e6dfaa"]) {
    const bioElems = $(`td[bgcolor=${color}]`).get();
    if (bioElems.length > 0) {
      return bioElems;
    }
  }

  return [];
};

const getBioFromBody = ($: cheerio.Root) => {
  const bioElems = getBioElementsByColor($);

  return skipSummary(
    bioElems.flatMap(flattenElement).reduce((prev, e) => {
      if (e.type === "text") {
        return prev + $(e).text();
      }

      switch (e.tagName) {
        case "font":
          if (e.attribs.size === "-1") {
            console.log("found font skipping");
            return prev;
          }
          return prev + $(e).text();
        case "hr":
        case "br":
          return prev + "\n\n";
        case "p":
        case "div":
          return prev + "\n" + $(e).text();
        default:
          return prev + $(e).text();
      }
    }, ""),
  ).trim();
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

// Some of these have bad titles so it requires manual fixing.
const nameExceptions: Record<string, string> = {
  "vol6/belleli.html": "Tractor's Revenge",
  "vol7/blkjks.html": "BLK JKS",
  "vol7/kem.html": "Kern",
  "vol4/eae.html": "The Electronic Art Ensemble",
  "avant/zeier.html": "Marc Zeier",
};

export const readArtistFromArtistPage = (
  artistUrl: string,
  content: string | Buffer,
) => {
  if (!artistUrlRegex.test(artistUrl)) {
    return null;
  }

  const $ = cheerio.load(content);

  let name = getNameFromBody($).trim();
  if (name === "%") {
    name = nameExceptions[artistUrl] ?? name;
  }

  return {
    name,
    bio: getBioFromBody($).trim(),
    albums: findInBody($),
    relatedArtists: getRelatedArtistsFromBody($, scruffyPath(artistUrl)),
    url: artistUrl,
  };
};

export const getArtistPage = (artistUrl: string, config?: AxiosRequestConfig) =>
  getPage(scruffyPath(artistUrl), config);

export const getArtistFromPage = (
  artistUrl: string,
  config?: AxiosRequestConfig,
) =>
  getPage(scruffyPath(artistUrl), config).then((page) => {
    const artist = readArtistFromArtistPage(artistUrl, page.data);
    if (artist) {
      return { ...artist, lastModified: page.lastModified, hash: page.hash };
    }

    return artist;
  });
