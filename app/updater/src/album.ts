import { getAlbum, getBestAlbumSearchResult } from "./deezer";
import { Prisma, prisma } from "@scruffy/database";
import {
  getNewRatingsPage,
  getYearRatingsPage,
  readAlbumsFromNewRatingsPage,
  readAlbumsFromYearRatingsPage,
} from "@scruffy/scraper";
import { getBiggestLastFMImage, getLastFMAlbum } from "./lastfm";
import { getBiggestSpotifyImage, getSpotifyAlbum } from "./spotify";
import { readPage } from "./page";
import { client } from "./scaruffi";
import {
  Observable,
  catchError,
  concatMap,
  from,
  map,
  mergeMap,
  of,
  partition,
  pipe,
} from "rxjs";
import { searchMusicBrainzAlbums } from "./musicbrainz";
import { MusicBrainzRelease } from "../dist";
import { addError, incrementAlbum } from "./update-status";
import { hasAlbumProvider } from "./env";
import { ReadAlbum } from "./types";

const catchAlbumError = <T>(
  artistURL: string,
  albumName: string,
  recoverWith?: T,
): ((o: Observable<T>) => Observable<T>) =>
  pipe(
    catchError((e) => {
      addError(`artistURL: ${artistURL}, albumName: ${albumName}`, e);
      return !!recoverWith ? of(recoverWith) : of();
    }),
  );

const withCatch =
  <T extends ReadAlbum>(f: (_: T) => Promise<T>) =>
  (a: T) =>
    of(a).pipe(concatMap(f), catchAlbumError(a.artistUrl, a.name, a));

export const addAlbumCoverAndReleaseYearFromMusicBrainz = withCatch(
  async <T extends ReadAlbum>(album: T) => {
    if (!hasAlbumProvider("musicbrainz") || (album.imageUrl && album.year)) {
      return album;
    }

    try {
      const albumSearchResult = await searchMusicBrainzAlbums(
        album.artistName,
        album.name,
      );

      const topResult = albumSearchResult.releases.reduce<
        MusicBrainzRelease | undefined
      >((prev, cur) => {
        if (!prev || cur.score > prev.score) return cur;
        if (cur.score === prev.score) {
          const curYear = new Date(cur.date).getFullYear();
          const prevYear = new Date(prev.date).getFullYear();
          if (curYear < prevYear) return cur;
        }
        return prev;
      }, undefined);

      return {
        ...album,
        imageUrl: album.imageUrl ?? topResult?.front,
        year:
          album.year ??
          (topResult?.date !== undefined
            ? new Date(topResult?.date ?? "").getFullYear()
            : undefined),
      };
    } catch (e) {
      return album;
    }
  },
);

export const addAlbumCoverAndReleaseYearFromDeezer = withCatch(
  async <T extends ReadAlbum>(album: T) => {
    if (!hasAlbumProvider("deezer") || (album.imageUrl && album.year)) {
      return album;
    }

    const albumSearchResult = await getBestAlbumSearchResult(
      album.artistName,
      album.name,
    );

    if (album.year || !albumSearchResult) {
      return { ...album, imageUrl: albumSearchResult?.cover_xl };
    }

    const deezerAlbum = await getAlbum(albumSearchResult.id);

    return {
      ...album,
      imageUrl: album.imageUrl ?? albumSearchResult.cover_xl,
      year: deezerAlbum?.release_date
        ? new Date(deezerAlbum.release_date).getFullYear()
        : undefined,
    };
  },
);

export const addAlbumCoverFromLastFM = withCatch(
  async <T extends ReadAlbum>(album: T) => {
    if (!hasAlbumProvider("lastfm") || !!album.imageUrl) {
      return album;
    }

    try {
      const albumSearchResult = await getLastFMAlbum(
        album.artistName,
        album.name,
      );

      const cover = getBiggestLastFMImage(albumSearchResult?.album.image);

      return { ...album, imageUrl: cover?.["#text"] };
    } catch (e) {
      return album;
    }
  },
);

export const addAlbumCoverAndReleaseYearFromSpotify = withCatch(
  async <T extends ReadAlbum>(album: T) => {
    if (!hasAlbumProvider("spotify") || !!album.imageUrl) {
      return album;
    }

    try {
      const bestMatch = await getSpotifyAlbum(album.artistName, album.name);

      const cover = getBiggestSpotifyImage(bestMatch?.images ?? []);
      const year = new Date(bestMatch.release_date).getFullYear();

      return {
        ...album,
        imageUrl: cover?.url,
        year: album.year ?? isNaN(year) ? undefined : year,
      };
    } catch (e) {
      return album;
    }
  },
);

type RatingsPageData = ReturnType<typeof readAlbumsFromNewRatingsPage>;

export const splitRatingsPageData = (
  d: Observable<{
    url: string;
    lastModified: Date;
    hash: string;
    data: RatingsPageData;
  }>,
): [Observable<{ type: "artist"; url: string }>, Observable<ReadAlbum>] => {
  const o = d.pipe(
    mergeMap(({ data, ...page }) =>
      from([
        ...Object.entries(data.artists).map(([url]) => ({
          url,
          type: "artist" as const,
        })),
        ...data.albums.map((a) => ({
          ...a,
          type: "album" as const,
          artistName: data.artists[a.artistUrl]?.name ?? "",
          page,
        })),
      ]),
    ),
  );

  return partition(
    o,
    (a): a is { url: string; type: "artist" } => a.type === "artist",
  );
};

export const readYearRatingsPage = (year: number) =>
  readPage(() => getYearRatingsPage(year, client)).pipe(
    catchError((e) => {
      console.error(`could not read ratings page for year ${year}`, e);
      return of();
    }),
    map(({ data, ...page }) => {
      const { artists, albums } = readAlbumsFromYearRatingsPage(year, data);
      return {
        data: {
          artists,
          albums: albums.map(
            (a): ReadAlbum => ({
              ...a,
              artistName: artists[a.artistUrl]?.name ?? "",
              type: "album",
              page,
            }),
          ),
        },
        ...page,
      };
    }),
  );

export const readNewRatingsPage = () =>
  readPage(() => getNewRatingsPage(client)).pipe(
    catchError((e) => {
      console.error(`could not read new ratings page`, e);
      return of();
    }),
    map(({ data, ...page }) => ({
      data: readAlbumsFromNewRatingsPage(data),
      ...page,
    })),
  );

export const insertAlbum = withCatch(({ page, ...album }: ReadAlbum) =>
  prisma.$transaction(async (tx) => {
    await tx.updateHistory.upsert({
      where: { pageURL: page.url },
      create: { pageURL: page.url, hash: page.hash },
      update: {},
    });

    const input: Prisma.AlbumCreateInput = {
      name: album.name,
      year: album.year ?? null,
      rating: album.rating,
      imageUrl: album.imageUrl ?? null,
      artist: {
        connectOrCreate: {
          where: { url: album.artistUrl },
          create: {
            url: album.artistUrl,
            name: "",
            lastModified: new Date(),
          },
        },
      },
      fromUpdate: { connect: { pageURL: page.url } },
    };

    incrementAlbum();
    await prisma.album.upsert({
      where: {
        artistUrl_name: { artistUrl: album.artistUrl, name: album.name },
      },
      create: input,
      update: input,
    });

    return { page, ...album };
  }),
);
