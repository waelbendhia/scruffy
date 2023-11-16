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
import { map } from "rxjs";

export const addAlbumCoverAndReleaseYearFromDeezer = async <
  T extends Omit<ReadAlbum, "artistUrl">,
>(
  artistName: string,
  album: T,
) => {
  if (album.imageUrl && album.year) {
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
  if (album.imageUrl) {
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
  if (album.imageUrl) {
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
    map(({ data, ...page }) => ({
      data: readAlbumsFromYearRatingsPage(year, data),
      ...page,
    })),
  );

export const readNewRatingsPage = () =>
  readPage(() => getNewRatingsPage(client)).pipe(
    map(({ data, ...page }) => ({
      data: readAlbumsFromNewRatingsPage(data),
      ...page,
    })),
  );

export const insertAlbum = (album: ReadAlbum & { pageURL: string }) =>
  prisma.album.upsert({
    where: {
      artistUrl_name: { artistUrl: album.artistUrl, name: album.name },
    },
    create: { ...album },
    update: { ...album },
  });
