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

type ReadArtist = Observed<ReturnType<typeof readArtist>>;

export const addImagesAndReleaseYears = (artist: ReadArtist) =>
  from(getBestArtistSearchResult(artist.name)).pipe(
    concatMap((searchResult) =>
      from(artist.albums ?? []).pipe(
        mergeMap(async (album) => {
          const albumSearchResult = await getBestAlbumSearchResult(
            artist.name,
            album.name,
          );

          if (!!album.year || !albumSearchResult) {
            return { ...album, imageUrl: albumSearchResult?.cover_xl };
          }

          const deezerAlbum = await getAlbum(albumSearchResult.id);
          const year = deezerAlbum?.release_date
            ? new Date(deezerAlbum.release_date).getFullYear()
            : undefined;
          console.debug(
            `setting year ${year} for album ${artist.name} - ${album.name}`,
          );

          return {
            ...album,
            imageUrl: albumSearchResult.cover_xl,
            year: deezerAlbum?.release_date
              ? new Date(deezerAlbum.release_date).getFullYear()
              : undefined,
          };
        }, conncurentConnections),
        toArray(),
        map((albums) => ({
          ...artist,
          imageUrl: searchResult?.picture_xl,
          albums,
        })),
      ),
    ),
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
