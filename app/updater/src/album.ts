import { getAlbum, getBestAlbumSearchResult } from "./deezer";
import { prisma } from "@scruffy/database";
import {
  ReadAlbum,
  getNewRatingsPage,
  getYearRatingsPage,
  readAlbumsFromNewRatingsPage,
  readAlbumsFromYearRatingsPage,
} from "@scruffy/scraper";
import { getBiggestLastFMImage, getLastFMAlbum } from "./lastfm";
import { getBiggestSpotifyImage, getSpotifyAlbum } from "./spotify";
import { readPage } from "./page";
import { client } from "./scaruffi";
import { catchError, map, of } from "rxjs";
import { searchMusicBrainzAlbums } from "./musicbrainz";
import { MusicBrainzRelease } from "../dist";
import { incrementAlbum } from "./update-status";
import { hasAlbumProvider } from "./env";

export const addAlbumCoverAndReleaseYearFromMusicBrainz = async <
  T extends Omit<ReadAlbum, "artistUrl">,
>(
  artistName: string,
  album: T,
) => {
  if (!hasAlbumProvider("musicbrainz") || (album.imageUrl && album.year)) {
    return album;
  }

  try {
    const albumSearchResult = await searchMusicBrainzAlbums(
      artistName,
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
};

export const addAlbumCoverAndReleaseYearFromDeezer = async <
  T extends Omit<ReadAlbum, "artistUrl">,
>(
  artistName: string,
  album: T,
) => {
  if (!hasAlbumProvider("deezer") || (album.imageUrl && album.year)) {
    return album;
  }

  const albumSearchResult = await getBestAlbumSearchResult(
    artistName,
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
};

export const addAlbumCoverFromLastFM = async <
  T extends Omit<ReadAlbum, "artistUrl">,
>(
  artistName: string,
  album: T,
) => {
  if (!hasAlbumProvider("lastfm") || !!album.imageUrl) {
    return album;
  }

  try {
    const albumSearchResult = await getLastFMAlbum(artistName, album.name);

    const cover = getBiggestLastFMImage(albumSearchResult?.album.image);

    return { ...album, imageUrl: cover?.["#text"] };
  } catch (e) {
    return album;
  }
};

export const addAlbumCoverFromSpotify = async <
  T extends Omit<ReadAlbum, "artistUrl">,
>(
  artistName: string,
  album: T,
) => {
  if (!hasAlbumProvider("spotify") || !!album.imageUrl) {
    return album;
  }

  try {
    const bestMatch = await getSpotifyAlbum(artistName, album.name);

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
};

export const readYearRatingsPage = (year: number) =>
  readPage(() => getYearRatingsPage(year, client)).pipe(
    catchError((e) => {
      console.error(`could not read ratings page for year ${year}`, e);
      return of();
    }),
    map(({ data, ...page }) => ({
      data: readAlbumsFromYearRatingsPage(year, data),
      ...page,
    })),
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

export const insertAlbum = (album: ReadAlbum & { pageURL: string }) => {
  incrementAlbum();
  return prisma.album.upsert({
    where: {
      artistUrl_name: { artistUrl: album.artistUrl, name: album.name },
    },
    create: { ...album },
    update: { ...album },
  });
};
