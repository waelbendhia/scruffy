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
  retry,
  timer,
  catchError,
} from "rxjs";
import { AxiosRequestConfig, isAxiosError } from "axios";
import { Agent } from "http";
import { conncurentConnections } from "./env";
import { Observed } from "./types";
import {
  getAlbum,
  getBestAlbumSearchResult,
  getBestArtistSearchResult,
} from "./deezer";
import {
  getBiggestLastFMImage,
  getLastFMAlbum,
  getLastFMArtist,
} from "./lastfm";
import { rateLimit } from "./rate-limit";
import { URL } from "url";

type PageData = Awaited<ReturnType<typeof getPage>>;

const is404Error = (e: unknown) =>
  isAxiosError(e) && e.response?.status === 404;

/** Read page if no previous updateHistory entry is found or it does not match */
const readPage = (getter: () => Promise<PageData>) =>
  from(getter()).pipe(
    retry({
      count: 10,
      delay: (err, count) =>
        is404Error(err) ? of() : timer(1_000 * 1.5 ** count),
    }),
    concatMap((page) =>
      from(
        prisma.updateHistory.findUnique({ where: { pageURL: page.url } }),
      ).pipe(concatMap((prev) => (prev?.hash === page.hash ? of() : of(page)))),
    ),
  );

const readArtistsPage = (
  getter: () => Promise<PageData>,
  reader: (_: string | Buffer) => Record<string, { name: string }>,
) =>
  readPage(getter).pipe(
    map(({ data, ...page }) => ({ ...page, artists: reader(data) })),
  );

type Volume = Parameters<typeof readArtistsFromVolumePage>[0];

const config: AxiosRequestConfig = {
  timeout: 5_000,
  httpAgent: new Agent({
    keepAlive: true,
    maxSockets: conncurentConnections,
  }),
};

export const readRockPage = () =>
  readArtistsPage(() => getRockPage(config), readArtistsFromRockPage);
export const readJazzPage = () =>
  readArtistsPage(() => getJazzPage(config), readArtistsFromJazzPage);
export const readVolumePage = (volume: Volume) =>
  readArtistsPage(
    () => getVolumePage(volume, config),
    (data) => readArtistsFromVolumePage(volume, data),
  );

export const readArtist = (url: string) =>
  readPage(() => getPage(url)).pipe(
    concatMap(({ data, ...page }) => {
      const artist = readArtistFromArtistPage(url, data);
      if (!artist || !artist?.name) {
        console.debug(`no change for ${artist?.url}`);
        return of();
      }

      console.debug(`updating ${artist?.url}`);

      return of({ ...page, ...artist });
    }),
  );

type ReadArtistWithoutImage = Observed<ReturnType<typeof readArtist>>;
type ReadAlbumWithoutImage = ReadArtistWithoutImage["albums"][number];

type ReadArtist = Omit<ReadArtistWithoutImage, "albums"> & {
  imageUrl?: string | undefined;
  albums: (ReadAlbumWithoutImage & { imageUrl?: string })[];
};

export const addImagesFromLastFM = (artist: ReadArtist) =>
  of(artist).pipe(
    concatMap(async (a) => {
      if (a.imageUrl) {
        return a;
      }

      const searchResult = await getLastFMArtist(a.name);
      return {
        ...a,
        imageUrl: getBiggestLastFMImage(searchResult?.artist.image)?.["#text"],
      };
    }),
    catchError(() => of(artist)),
    concatMap((a) =>
      from(a.albums ?? []).pipe(
        rateLimit(5, 1100),
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
    concatMap((a) =>
      from(a.albums ?? []).pipe(
        concatMap(async (album) => {
          if (album.imageUrl && album.year) {
            return album;
          }

          const albumSearchResult = await getBestAlbumSearchResult(
            a.name,
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
        }),
        toArray(),
        map((albums) => ({ ...a, albums })),
      ),
    ),
  );

export const addImagesAndReleaseYears = (artist: ReadArtist) =>
  of(artist).pipe(
    concatMap(addImagesFromLastFM),
    concatMap(addImagesAndReleaseYearsFromDeezer),
  );

type ReadArtistWithImages = Observed<
  ReturnType<typeof addImagesAndReleaseYears>
>;

export const insertArtist = (artist: ReadArtistWithImages) =>
  from(
    prisma.$transaction(async (tx) => {
      const now = new Date();

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

      return await tx.artist.upsert({
        where: { url: artist.url },
        create: createOrUpdateInput,
        update: createOrUpdateInput,
      });
    }),
  );
