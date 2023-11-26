import { prisma } from "@scruffy/database";
import {
  incrementPages,
  markUpdateEnd,
  markUpdateStart,
} from "./update-status";
import {
  concatMap,
  from,
  map,
  merge,
  mergeMap,
  of,
  distinct,
  toArray,
  reduce,
  count,
  finalize,
  takeUntil,
  repeat,
  delay,
} from "rxjs";
import { databaseConcurrency, recheckDelay } from "./env";
import {
  insertArtistWithImages,
  readJazzPage,
  readRockPage,
  readVolumePage,
} from "./artists";
import {
  addAlbumCoverAndReleaseYearFromDeezer,
  addAlbumCoverAndReleaseYearFromMusicBrainz,
  addAlbumCoverFromLastFM,
  addAlbumCoverFromSpotify,
  insertAlbum,
  readNewRatingsPage,
  readYearRatingsPage,
} from "./album";
import { api } from "./api/server";
import { watchStartSignal, watchStopSignal } from "./start-stop-signal";

const range = (start: number, end: number): number[] => {
  let a = [];
  for (let i = start; i < end; i++) {
    a.push(i);
  }
  return a;
};

const loadAndInsertRatingsPages = () =>
  merge(
    ...range(1990, new Date().getFullYear()).map(readYearRatingsPage),
    readNewRatingsPage(),
  ).pipe(
    concatMap(async (p) => {
      incrementPages();
      await prisma.updateHistory.upsert({
        where: { pageURL: p.url },
        create: { pageURL: p.url, hash: p.hash },
        update: { hash: p.hash, checkedOn: new Date() },
      });

      return p;
    }),
    toArray(),
    concatMap((ps) =>
      from(ps).pipe(
        mergeMap((p) => from(Object.entries(p.data.artists))),
        mergeMap(
          ([url]) =>
            from(prisma.artist.count({ where: { url } })).pipe(
              concatMap((c) => (c > 0 ? of() : of(url))),
            ),
          databaseConcurrency,
        ),
        takeUntil(watchStopSignal()),
        insertArtistWithImages(),
        count(),
        map(() => ps),
      ),
    ),
    mergeMap((ps) => from(ps)),
    mergeMap((p) =>
      from(p.data.albums.map((album) => ({ ...album, pageURL: p.url }))),
    ),
    takeUntil(watchStopSignal()),
    mergeMap((a) => addAlbumCoverAndReleaseYearFromMusicBrainz(a.name, a)),
    mergeMap((a) => addAlbumCoverFromSpotify(a.name, a)),
    mergeMap((a) => addAlbumCoverAndReleaseYearFromDeezer(a.name, a)),
    mergeMap((a) => addAlbumCoverFromLastFM(a.name, a)),
    concatMap((a) => insertAlbum(a)),
  );

const loadAndInsertFromArtistPages = () =>
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
    takeUntil(watchStopSignal()),
    concatMap(async (p) => {
      incrementPages();
      await prisma.updateHistory.upsert({
        where: { pageURL: p.url },
        create: { pageURL: p.url, hash: p.hash },
        update: { hash: p.hash, checkedOn: new Date() },
      });

      return p;
    }),
    concatMap(({ artists }) =>
      from(
        Object.entries(artists).map(([url, o]) => ({
          ...o,
          url,
          type: "artist" as const,
        })),
      ),
    ),
    distinct((v) => `${v.type}-${v.url}`),
    takeUntil(watchStopSignal()),
    toArray(),
    concatMap((as) => {
      console.debug(`discovered ${as.length} unique artists`);
      return from(as);
    }),
    map(({ url }) => url),
    takeUntil(watchStopSignal()),
    insertArtistWithImages(),
    reduce((p) => p, 0),
  );

const fullUpdate = () =>
  of("").pipe(
    map(() => markUpdateStart()),
    concatMap(() => loadAndInsertRatingsPages()),
    reduce((p) => p, 0),
    concatMap(() => loadAndInsertFromArtistPages()),
    takeUntil(watchStopSignal()),
    reduce((p) => p, 0),
    finalize(() => {
      markUpdateEnd();
    }),
  );

const sub = fullUpdate()
  .pipe(
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
