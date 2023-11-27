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
  toArray,
  catchError,
  pipe,
} from "rxjs";
import { concurrency, conncurentConnections } from "./env";
import { Observed } from "./types";
import { getBestArtistSearchResult } from "./deezer";
import { getBiggestLastFMImage, getLastFMAlbum } from "./lastfm";
import { readPage } from "./page";
import { URL } from "url";
import {
  addAlbumCoverAndReleaseYearFromDeezer,
  addAlbumCoverAndReleaseYearFromMusicBrainz,
  addAlbumCoverFromSpotify,
} from "./album";
import { client } from "./scaruffi";
import { getBiggestSpotifyImage, getSpotifyArtist } from "./spotify";
import {
  incrementAlbum,
  incrementArtist,
  incrementPages,
} from "./update-status";

type PageData = Awaited<ReturnType<typeof getPage>>;

const readArtistsPage = (
  page: string,
  getter: () => Promise<PageData>,
  reader: (_: string | Buffer) => Record<string, { name: string }>,
) =>
  readPage(getter).pipe(
    catchError((e) => {
      console.error(`could not read artists from page ${page}`, e);
      return of();
    }),
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

export const readArtist = (url: string) =>
  readPage(() => getPage(url, client)).pipe(
    concatMap(({ data, ...page }) => {
      const artist = readArtistFromArtistPage(url, data);
      if (!artist || !artist?.name) {
        console.debug(`invalid artist ${url}`);
        return of();
      }

      return of({ ...page, ...artist });
    }),
  );

type ReadArtistWithoutImage = Observed<ReturnType<typeof readArtist>>;
type ReadAlbum = ReadArtistWithoutImage["albums"][number] & {
  imageUrl?: string;
};

type ReadArtist = Omit<ReadArtistWithoutImage, "albums"> & {
  imageUrl?: string | undefined;
  albums: ReadAlbum[];
};

export const addImagesFromLastFM = (artist: ReadArtist) =>
  of(artist).pipe(
    catchError(() => of(artist)),
    concatMap((a) =>
      from(a.albums ?? []).pipe(
        mergeMap(async (album) => {
          if (album.imageUrl) {
            return album;
          }

          try {
            const albumSearchResult = await getLastFMAlbum(a.name, album.name);

            const cover = getBiggestLastFMImage(albumSearchResult?.album.image);

            return { ...album, imageUrl: cover?.["#text"] };
          } catch (e) {
            return album;
          }
        }, conncurentConnections),
        toArray(),
        map((albums) => ({ ...a, albums })),
      ),
    ),
  );

const deezerDefaultImage = "1000x1000-000000-80-0-0.jpg";

export const addImagesAndReleaseYearsFromDeezer = (artist: ReadArtist) =>
  of(artist).pipe(
    concatMap(async (a) => {
      if (!!a.imageUrl) {
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
    }),
    mergeMap(
      (a) =>
        from(a.albums ?? []).pipe(
          concatMap((album) =>
            addAlbumCoverAndReleaseYearFromDeezer(a.name, album),
          ),
          toArray(),
          map((albums) => ({ ...a, albums })),
        ),
      concurrency,
    ),
  );

export const addImagesAndReleaseYearsFromSpotify = (artist: ReadArtist) =>
  of(artist).pipe(
    concatMap(async (a) => {
      if (!!a.imageUrl) {
        return a;
      }

      const bestMatch = await getSpotifyArtist(a.name);
      if (!bestMatch) {
        return a;
      }

      const image = getBiggestSpotifyImage(bestMatch.images);

      return { ...a, imageUrl: image?.url };
    }),
    concatMap((a) =>
      from(a.albums ?? []).pipe(
        mergeMap(
          (album) => addAlbumCoverFromSpotify(a.name, album),
          concurrency,
        ),
        toArray(),
        map((albums) => ({ ...a, albums })),
      ),
    ),
  );

export const addImagesAndReleaseYearsFromMusicBrainz = (artist: ReadArtist) =>
  of(artist).pipe(
    concatMap((a) =>
      from(a.albums ?? []).pipe(
        mergeMap(
          (album) => addAlbumCoverAndReleaseYearFromMusicBrainz(a.name, album),
          concurrency,
        ),
        toArray(),
        map((albums) => ({ ...a, albums })),
      ),
    ),
  );

export const addImagesAndReleaseYears = (artist: ReadArtist) =>
  of(artist).pipe(
    concatMap(addImagesAndReleaseYearsFromSpotify),
    concatMap(addImagesAndReleaseYearsFromDeezer),
    concatMap(addImagesFromLastFM),
  );

type ReadArtistWithImages = Observed<
  ReturnType<typeof addImagesAndReleaseYears>
>;

export const insertArtist = (artist: ReadArtistWithImages) =>
  from(
    prisma.$transaction(async (tx) => {
      const now = new Date();

      incrementPages();
      await tx.updateHistory.upsert({
        where: { pageURL: artist.url },
        create: {
          checkedOn: now,
          hash: artist.hash,
          pageURL: artist.url,
        },
        update: {
          checkedOn: now,
          hash: artist.hash,
          pageURL: artist.url,
        },
      });

      const albums: Prisma.AlbumCreateNestedManyWithoutArtistInput = {
        connectOrCreate: artist.albums.map(
          (album): Prisma.AlbumCreateOrConnectWithoutArtistInput => ({
            where: {
              artistUrl_name: {
                artistUrl: artist.url,
                name: album.name,
              },
            },
            create: {
              name: album.name,
              year: album.year,
              rating: album.rating,
              imageUrl: album.imageUrl,
              fromUpdate: { connect: { pageURL: artist.url } },
            },
          }),
        ),
      };

      const createOrUpdateInput: Prisma.ArtistCreateInput &
        Prisma.ArtistUpdateInput = {
        name: artist.name,
        imageUrl: artist.imageUrl,
        lastModified: artist.lastModified,
        bio: artist.bio,
        fromUpdate: { connect: { pageURL: artist.url } },
        albums,
      };

      incrementArtist();
      incrementAlbum(artist.albums.length);
      return await tx.artist.upsert({
        where: { url: artist.url },
        create: createOrUpdateInput,
        update: createOrUpdateInput,
      });
    }),
  );

export const insertArtistWithImages = () =>
  pipe(
    mergeMap(
      (url: string) =>
        readArtist(url).pipe(
          catchError((e) => {
            console.debug("error: ", e);
            return of();
          }),
        ),
      concurrency,
    ),
    mergeMap(
      (a) =>
        addImagesAndReleaseYearsFromMusicBrainz(a).pipe(
          catchError((e) => {
            console.debug("error: ", e);
            return of();
          }),
        ),
      concurrency,
    ),
    mergeMap(
      (a) =>
        addImagesAndReleaseYearsFromSpotify(a).pipe(
          catchError((e) => {
            console.debug("error: ", e);
            return of();
          }),
        ),
      concurrency,
    ),
    mergeMap(
      (a) =>
        addImagesAndReleaseYearsFromDeezer(a).pipe(
          catchError((e) => {
            console.debug("error: ", e);
            return of();
          }),
        ),
      concurrency,
    ),
    mergeMap(
      (a) =>
        addImagesFromLastFM(a).pipe(
          catchError((e) => {
            console.debug("error: ", e);
            return of();
          }),
        ),
      concurrency,
    ),
    concatMap((v) =>
      insertArtist(v).pipe(
        catchError((e) => {
          console.debug("error: ", e);
          return of();
        }),
      ),
    ),
  );
