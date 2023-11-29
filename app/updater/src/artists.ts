import { Prisma, prisma } from "@scruffy/database";
import {
  getJazzPage,
  getPage,
  getRockPage,
  getVolumePage,
  readArtistFromArtistPage,
  readArtistsFromJazzPage,
  readArtistsFromRockPage,
  readArtistsFromVolumePage,
} from "@scruffy/scraper";
import {
  concatMap,
  from,
  of,
  map,
  mergeMap,
  catchError,
  pipe,
  Observable,
} from "rxjs";
import { concurrency, hasArtistProvider } from "./env";
import { ReadAlbum, ReadArtist } from "./types";
import { getBestArtistSearchResult } from "./deezer";
import { readPage } from "./page";
import { URL } from "url";
import { client } from "./scaruffi";
import { getBiggestSpotifyImage, getSpotifyArtist } from "./spotify";
import { addError, incrementArtist, incrementPages } from "./update-status";

type PageData = Awaited<ReturnType<typeof getPage>>;

const catchArtistError = <T>(
  artistURL: string,
  recoverWith?: T,
): ((o: Observable<T>) => Observable<T>) =>
  pipe(
    catchError((e) => {
      addError(`artistURL: ${artistURL}`, e);
      return !!recoverWith ? of(recoverWith) : of();
    }),
  );

const readArtistsPage = (
  page: string,
  getter: () => Promise<PageData>,
  reader: (_: string | Buffer) => Record<string, { name: string }>,
) =>
  readPage(getter).pipe(
    catchArtistError(page),
    map(({ data, ...page }) => ({ ...page, artists: reader(data) })),
  );

type Volume = Parameters<typeof readArtistsFromVolumePage>[0];

export const readRockPage = () =>
  readArtistsPage(
    "rock page",
    () => getRockPage(client),
    readArtistsFromRockPage,
  );

export const readJazzPage = () =>
  readArtistsPage(
    "jazz page",
    () => getJazzPage(client),
    readArtistsFromJazzPage,
  );

export const readVolumePage = (volume: Volume) =>
  readArtistsPage(
    `volume ${volume}`,
    () => getVolumePage(volume, client),
    (data) => readArtistsFromVolumePage(volume, data),
  );

export const readDataFromArtistPage = (url: string) =>
  readPage(() => getPage(url, client)).pipe(
    concatMap(({ data, ...page }) => {
      const artist = readArtistFromArtistPage(url, data);
      if (!artist || !artist?.name) {
        console.debug(`invalid artist ${url}`);
        return of();
      }

      const { albums, ...a } = artist;

      return from([
        { type: "artist" as const, page, ...a } satisfies ReadArtist,
        ...albums.map(
          (album): ReadAlbum => ({
            ...album,
            page,
            type: "album" as const,
            artistName: artist.name,
            artistUrl: a.url,
          }),
        ),
      ]);
    }),
    catchArtistError(url),
  );

const deezerDefaultImage = "1000x1000-000000-80-0-0.jpg";

const withCatch =
  <T extends ReadArtist>(f: (_: T) => Promise<T>) =>
  (a: T) =>
    of(a).pipe(concatMap(f), catchArtistError(a.url, a));

export const addArtistImageFromDeezer = withCatch(
  async <T extends ReadArtist>(a: T) => {
    if (!hasArtistProvider("deezer") || !!a.imageUrl) {
      return a;
    }

    const searchResult = await getBestArtistSearchResult(a.name);
    if (!searchResult) {
      return a;
    }

    const path = new URL(searchResult.picture_xl).pathname.split("/");
    if (path[path.length - 1] === deezerDefaultImage) {
      return a;
    }

    return { ...a, imageUrl: searchResult?.picture_xl };
  },
);

export const addArtistImageFromSpotify = withCatch(
  async <T extends ReadArtist>(a: T) => {
    if (!hasArtistProvider("spotify") || !!a.imageUrl) {
      return a;
    }

    const bestMatch = await getSpotifyArtist(a.name);
    if (!bestMatch) {
      return a;
    }

    const image = getBiggestSpotifyImage(bestMatch.images);

    return { ...a, imageUrl: image?.url };
  },
);

export const addArtistImage: <T extends ReadArtist>(
  source: Observable<T>,
) => Observable<T> = pipe(
  mergeMap(addArtistImageFromSpotify, concurrency),
  mergeMap(addArtistImageFromDeezer, concurrency),
);

export const insertArtist = withCatch(<T extends ReadArtist>(artist: T) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();

    incrementPages();
    await tx.updateHistory.upsert({
      where: { pageURL: artist.url },
      create: {
        checkedOn: now,
        hash: artist.page.hash,
        pageURL: artist.url,
      },
      update: {
        checkedOn: now,
        hash: artist.page.hash,
        pageURL: artist.url,
      },
    });

    const createOrUpdateInput: Prisma.ArtistCreateInput &
      Prisma.ArtistUpdateInput = {
      name: artist.name,
      imageUrl: artist.imageUrl,
      lastModified: artist.page.lastModified,
      bio: artist.bio,
      fromUpdate: { connect: { pageURL: artist.url } },
    };

    incrementArtist();
    await tx.artist.upsert({
      where: { url: artist.url },
      create: createOrUpdateInput,
      update: createOrUpdateInput,
    });

    return artist;
  }),
);

export const processArtist = pipe(
  mergeMap(addArtistImageFromSpotify, concurrency),
  mergeMap(addArtistImageFromDeezer, concurrency),
  concatMap(insertArtist),
);
