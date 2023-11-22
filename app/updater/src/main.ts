import { prisma } from "@scruffy/database";
import {
  concatMap,
  from,
  interval,
  map,
  merge,
  mergeMap,
  of,
  distinct,
  toArray,
  reduce,
  count,
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
  addAlbumCoverFromLastFM,
  addAlbumCoverFromSpotify,
  insertAlbum,
  readNewRatingsPage,
  readYearRatingsPage,
} from "./album";

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
    mergeMap(
      (p) =>
        prisma.updateHistory
          .upsert({
            where: { pageURL: p.url },
            create: { pageURL: p.url, hash: p.hash },
            update: { hash: p.hash, checkedOn: new Date() },
          })
          .then(() => p),
      databaseConcurrency,
    ),
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
        insertArtistWithImages(),
        count(),
        map(() => ps),
      ),
    ),
    mergeMap((ps) => from(ps)),
    mergeMap((p) =>
      from(p.data.albums.map((album) => ({ ...album, pageURL: p.url }))),
    ),
    mergeMap((a) => addAlbumCoverFromSpotify(a.name, a)),
    mergeMap((a) => addAlbumCoverAndReleaseYearFromDeezer(a.name, a)),
    mergeMap((a) => addAlbumCoverFromLastFM(a.name, a)),
    mergeMap((a) => insertAlbum(a), databaseConcurrency),
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
    mergeMap(
      (p) =>
        prisma.updateHistory
          .upsert({
            where: { pageURL: p.url },
            create: { pageURL: p.url, hash: p.hash },
            update: { hash: p.hash, checkedOn: new Date() },
          })
          .then(() => p),
      databaseConcurrency,
    ),
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
    toArray(),
    concatMap((as) => {
      console.debug(`discovered ${as.length} unique artists`);
      return from(as);
    }),
    map(({ url }) => url),
    insertArtistWithImages(),
    reduce((total, _): number => {
      console.debug(`inserted ${total + 1} artists`);
      return total + 1;
    }, 0),
  );

const fullUpdate = () =>
  loadAndInsertRatingsPages().pipe(
    reduce((p) => p, 0),
    concatMap(() => loadAndInsertFromArtistPages()),
    reduce((p) => p, 0),
  );

const sub = fullUpdate()
  .pipe(
    map(() => {
      console.log("check complete");
    }),
    concatMap(() => interval(recheckDelay * 1000)),
    map(() => {
      console.debug("rechecking");
    }),
    concatMap(() => fullUpdate()),
    map(() => {
      console.log("check complete");
    }),
  )
  .subscribe(() => {});

const exit = async () => {
  sub.unsubscribe();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", exit);
process.on("SIGINT", exit);
