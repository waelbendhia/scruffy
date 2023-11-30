import { prisma } from "@scruffy/database";
import {
  concatMap,
  from,
  map,
  merge,
  mergeMap,
  of,
  distinct,
  count,
  repeat,
  delay,
  finalize,
  takeUntil,
  defer,
  filter,
  mergeWith,
  reduce,
  Observable,
  OperatorFunction,
  pipe,
  tap,
} from "rxjs";
import { concurrency, recheckDelay } from "./env";
import {
  addArtistImageFromDeezer,
  addArtistImageFromSpotify,
  insertArtist,
  readDataFromArtistPage,
  readJazzPage,
  readRockPage,
  readVolumePage,
} from "./artists";
import {
  addAlbumCoverAndReleaseYearFromDeezer,
  addAlbumCoverAndReleaseYearFromMusicBrainz,
  addAlbumCoverAndReleaseYearFromSpotify,
  addAlbumCoverFromLastFM,
  insertAlbum,
  readNewRatingsPage,
  readYearRatingsPage,
} from "./album";
import { api } from "./api/server";
import { watchStartSignal, watchStopSignal } from "./start-stop-signal";
import { ReadAlbum, ReadArtist } from "./types";
import { markUpdateEnd, markUpdateStart } from "./update-status";

const range = (start: number, end: number): number[] => {
  let a = [];
  for (let i = start; i < end; i++) {
    a.push(i);
  }
  return a;
};

const readRatingsPages = () =>
  merge(
    ...range(1990, new Date().getFullYear()).map(readYearRatingsPage),
    readNewRatingsPage(),
  ).pipe(
    concatMap((p) =>
      prisma.updateHistory
        .upsert({
          where: { pageURL: p.url },
          create: { pageURL: p.url, hash: p.hash, checkedOn: new Date() },
          update: { pageURL: p.url, hash: p.hash, checkedOn: new Date() },
        })
        .then(() => p),
    ),
  );

const readArtistPages = () =>
  merge(
    readRockPage(),
    readJazzPage(),
    readVolumePage(1),
    readVolumePage(2),
    readVolumePage(3),
    readVolumePage(4),
    readVolumePage(5),
    readVolumePage(6),
    readVolumePage(7),
    readVolumePage(8),
  ).pipe(
    concatMap((p) =>
      prisma.updateHistory
        .upsert({
          where: { pageURL: p.url },
          create: { pageURL: p.url, hash: p.hash, checkedOn: new Date() },
          update: { pageURL: p.url, hash: p.hash, checkedOn: new Date() },
        })
        .then(() => p),
    ),
  );

type SplitArrays<T, U> = {
  match: T[];
  rest: U[];
};

const partitionToArrays =
  <T, U extends T>(p: (x: T) => x is U) =>
  (o: Observable<T>): Observable<SplitArrays<U, Exclude<T, U>>> =>
    o.pipe(
      reduce<T, SplitArrays<U, Exclude<T, U>>>(
        ({ match, rest }, c) => {
          if (p(c)) {
            return { match: [...match, c], rest };
          } else {
            return { match, rest: [...rest, c as Exclude<T, U>] };
          }
        },
        { match: [], rest: [] },
      ),
    );

const processArtists = (): OperatorFunction<ReadArtist, number> =>
  pipe(
    takeUntil(watchStopSignal()),
    mergeMap(addArtistImageFromSpotify, concurrency),
    mergeMap(addArtistImageFromDeezer, concurrency),
    concatMap(insertArtist),
    takeUntil(watchStopSignal()),
    count(),
  );

const processAlbums = (): OperatorFunction<ReadAlbum, number> =>
  pipe(
    distinct((a: ReadAlbum) => `${a.artistUrl}-${a.name}`),
    takeUntil(watchStopSignal()),
    mergeMap(addAlbumCoverAndReleaseYearFromMusicBrainz, concurrency),
    mergeMap(addAlbumCoverAndReleaseYearFromSpotify, concurrency),
    mergeMap(addAlbumCoverAndReleaseYearFromDeezer, concurrency),
    mergeMap(addAlbumCoverFromLastFM, concurrency),
    concatMap(insertAlbum),
    takeUntil(watchStopSignal()),
    count(),
  );

const performFullUpdate = () =>
  readRatingsPages().pipe(
    takeUntil(watchStopSignal()),
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
    partitionToArrays(
      (a): a is { type: "artist"; url: string } => a.type === "artist",
    ),
    concatMap(({ match: artistURLsFromRatings, rest: albums }) =>
      readArtistPages().pipe(
        takeUntil(watchStopSignal()),
        concatMap((d) =>
          from(
            Object.entries(d.artists).map(([url]) => ({
              type: "artist" as const,
              url,
            })),
          ),
        ),
        mergeWith(artistURLsFromRatings),
        distinct((v) => v.url),
        filter((v) => v.url !== "/vol5/x.html"),
        mergeMap((a) => readDataFromArtistPage(a.url), concurrency),
        partitionToArrays((a): a is ReadArtist => a.type === "artist"),
        map(({ match: artists, rest: albumsFromArtistsPage }) => ({
          artists,
          albums: [...albums, ...albumsFromArtistsPage],
        })),
        tap(({ artists }) => console.log(`found ${artists.length} artists`)),
      ),
    ),
    concatMap(({ artists, albums }) =>
      from(artists).pipe(
        processArtists(),
        tap((c) => console.debug(`inserted ${c} artists.`)),
        tap(() => console.log(`found ${albums.length} albums`)),
        concatMap(() => from(albums)),
        distinct((a) => `${a.artistUrl}-${a.name}`),
        processAlbums(),
        tap((c: number) => console.debug(`inserted ${c} albums.`)),
      ),
    ),
    finalize(() => {
      markUpdateEnd();
    }),
  );

const performFullUpdateWithStatusUpdates = () =>
  defer(() => {
    markUpdateStart();
    return performFullUpdate();
  }).pipe(
    finalize(() => {
      markUpdateEnd();
    }),
  );

const sub = from(prisma.$queryRaw`PRAGMA journal_mode = WAL`)
  .pipe(
    concatMap((res) => {
      console.log(res);
      return performFullUpdateWithStatusUpdates();
    }),
    repeat({
      delay: () =>
        merge(of("start").pipe(delay(recheckDelay * 1000)), watchStartSignal()),
    }),
  )
  .subscribe(() => {});

const exit = async () => {
  sub.unsubscribe();
  await api.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", exit);
process.on("SIGINT", exit);

const port = parseInt(process.env.UPDATER_PORT || "", 10) || 8002;
const host = process.env.UPDATER_HOST || "0.0.0.0";

api.listen({ port, host }, (err) => {
  if (err) {
    api.log.error(err);
    process.exit(1);
  }
});
