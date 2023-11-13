import { prisma } from "@scruffy/database";
import { AxiosRequestConfig, isAxiosError } from "axios";
import { Agent } from "http";
import {
  Observable,
  concatMap,
  from,
  map,
  mergeMap,
  of,
  reduce,
  retry,
  timer,
} from "rxjs";
import { getArtistPage, readArtistFromArtistPage } from "@scruffy/scraper";
import {
  getAlbum,
  getBestAlbumSearchResult,
  getBestArtistSearchResult,
} from "./deezer";

const parseIntFromEnv = (key: string) => {
  const env = process.env[key];
  const parsed = env ? parseInt(env) : undefined;
  return parsed && !isNaN(parsed) ? parsed : undefined;
};

const conncurentConnections = parseIntFromEnv("CONCURRENT_CONNECTIONS") ?? 20;
const databaseConcurrency = parseIntFromEnv("DATABASE_CONCURRENCY") ?? 2;

const config: AxiosRequestConfig = {
  timeout: 5_000,
  httpAgent: new Agent({
    keepAlive: true,
    maxSockets: conncurentConnections,
  }),
};

type BaseArtist = {
  url: string;
  name: string;
};

/** joins artists retrieved from index pages and filters existing ones. */
export const joinAndFilterPageData = (
  ps: Observable<Record<string, { name: string }>>,
) =>
  ps.pipe(
    reduce(
      (prev, cur) => ({ ...prev, ...cur }),
      {} as Record<string, { name: string }>,
    ),
    concatMap((rec) =>
      from(Object.entries(rec).map(([url, o]) => ({ ...o, url }))),
    ),
    mergeMap(
      (a) =>
        from(prisma.artist.count({ where: { url: a.url } })).pipe(
          concatMap((count) => (count > 0 ? of(a) : of())),
        ),
      databaseConcurrency,
    ),
  );

const shouldRetryFetch = (e: unknown) =>
  !isAxiosError(e) || (e.response?.status !== 404 && !(e instanceof TypeError));

export const retrieveArtist = ({ url }: BaseArtist) =>
  from(
    (async () => {
      const { data, lastModified } = await getArtistPage(url, config);
      const now = new Date();
      const artist = readArtistFromArtistPage(url, data);
      if (!artist) {
        return null;
      }

      return { ...artist, ts: now, lastModified };
    })(),
  ).pipe(
    retry({
      count: 10,
      delay: (err, count) =>
        shouldRetryFetch(err) ? timer(1_000 * 1.5 ** count) : of(),
    }),
    concatMap((a) => (a === null ? of() : of(a))),
  );

type Observed<O extends Observable<any>> = O extends Observable<infer x>
  ? x
  : never;

type RetrievedArtist = Observed<ReturnType<typeof retrieveArtist>>;
type RetrievedAlbum = RetrievedArtist["albums"][number] & {
  artist: BaseArtist;
};

const addAlbumArtAndReleaseYear = (as: Observable<RetrievedAlbum>) =>
  from(as).pipe(
    mergeMap(async (album) => {
      const result = await getBestAlbumSearchResult(
        album.artist.name,
        album.name,
      );
      return { ...album, imageUrl: result?.cover_xl, deezerID: result?.id };
    }, conncurentConnections),
    mergeMap(async (album) => {
      if (album.year !== undefined || album.deezerID === undefined)
        return album;
      const fullAlbum = await getAlbum(album.deezerID);
      return {
        ...album,
        year: new Date(fullAlbum.release_date).getFullYear(),
      };
    }, conncurentConnections),
  );

export const addArtAndReleaseDate = (a: RetrievedArtist) =>
  from(
    getBestArtistSearchResult(a.name).then((result) => ({
      ...a,
      imageUrl: result?.picture_xl,
    })),
  ).pipe(
    mergeMap(
      (a) =>
        from(a.albums).pipe(
          map((album) => ({ ...album, artist: { url: a.url, name: a.name } })),
          addAlbumArtAndReleaseYear,
          reduce(
            (prev, { deezerID, artist, ...album }) => [...prev, album],
            [] as Omit<
              Observed<ReturnType<typeof addAlbumArtAndReleaseYear>>,
              "deezerID" | "artist"
            >[],
          ),
          map((albums) => ({ ...a, albums })),
        ),
      conncurentConnections,
    ),
  );

export type FullArtist = Observed<ReturnType<typeof addArtAndReleaseDate>>;
