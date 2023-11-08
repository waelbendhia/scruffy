import axios, { AxiosRequestConfig } from "axios";
import { findInBody } from "./album";
import * as cheerio from "cheerio";

const basePath = "http://scaruffi.com";

const path = (pathname: string) => new URL(pathname, basePath).href;

const readArtistsFromPage = (
  content: string | Buffer,
  selectionFunction: (_: cheerio.Root) => string[],
) => {
  try {
    const $ = cheerio.load(content);
    const artistElements = selectionFunction($);

    return artistElements.reduce((p, elem) => {
      let artistUrl = $(elem).attr("href")?.substring(3);
      if (!artistUrl) {
        return p;
      }

      if (artistUrl?.indexOf("#") !== -1) {
        artistUrl = artistUrl.substring(0, artistUrl.indexOf("#"));
      }
      return {
        ...p,
        [artistUrl]: { name: $(elem).text().trim() },
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
    .then((resp) => resp.data);

export const getRockPage = (config?: AxiosRequestConfig) =>
  getPage("music/groups.html", config);

export const readArtistsFromRockPage = (content: string | Buffer) =>
  readArtistsFromPage(content, ($) => $("table:nth-of-type(3) a").get());

export const getArtistsFromRockPage = (config?: AxiosRequestConfig) =>
  getRockPage(config).then(readArtistsFromRockPage);

export const getJazzPage = (config?: AxiosRequestConfig) =>
  getPage("jazz/musician.html", config);

export const readArtistsFromJazzPage = (content: string | Buffer) =>
  readArtistsFromPage(content, ($) => $('[width="400"] a').get());

export const getArtistsFromJazzPage = (config?: AxiosRequestConfig) =>
  getJazzPage(config).then(readArtistsFromJazzPage);

type Volume = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const getVolumePage = (vol: Volume, config?: AxiosRequestConfig) =>
  getPage(`vol${vol}`, config);

export const readArtistsFromVolumePage = (
  vol: Volume,
  content: string | Buffer,
) =>
  readArtistsFromPage(content, ($) => {
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

      const pathname = new URL(href, path(`vol${vol}`)).pathname;
      $(entry).attr("href", pathname);
    });
    return elems;
  });

export const getArtistsFromVolumePage = (
  vol: Volume,
  config?: AxiosRequestConfig,
) =>
  getVolumePage(vol, config).then((content) =>
    readArtistsFromVolumePage(vol, content),
  );

export const getNewPage = (config?: AxiosRequestConfig) =>
  getPage("cdreview/new.html", config);

export const readArtistsFromNewPage = (content: string | Buffer) =>
  readArtistsFromPage(content, ($) => $("table td[bgcolor=000aaa] a").get());

export const getArtistsFromNewPage = (config?: AxiosRequestConfig) =>
  getNewPage(config).then(readArtistsFromNewPage);

const getNameFromBody = ($: cheerio.Root) => {
  if ($("center").get().length === 0) {
    return "";
  }

  let name = "",
    parentNode = $("center").get(0);

  while ($(parentNode).children().length > 0) {
    for (let i = 0; i < $(parentNode).children().length; i++) {
      name = $($(parentNode).children().get(i)).text().trim();
      if (!!name) {
        parentNode = $(parentNode).children().get(i);
        break;
      }
    }
  }

  return name;
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

export const readArtistFromArtistPage = (
  artistUrl: string,
  content: string | Buffer,
) => {
  const $ = cheerio.load(content);

  return {
    name: getNameFromBody($).trim(),
    bio: getBioFromBody($).trim(),
    albums: findInBody($),
    relatedArtists: getRelatedArtistsFromBody(
      $,
      `http://scaruffi.com/${artistUrl}`,
    ),
    url: artistUrl,
  };
};

export const getArtistFrompage = (
  artistUrl: string,
  config?: AxiosRequestConfig,
) =>
  getPage(path(artistUrl), config).then((content) =>
    readArtistFromArtistPage(artistUrl, content),
  );
