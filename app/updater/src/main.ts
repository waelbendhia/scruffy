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
  partition,
  finalize,
  takeUntil,
  defer,
  filter,
  retry,
  toArray,
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
  splitRatingsPageData,
} from "./album";
import { api } from "./api/server";
import { watchStartSignal, watchStopSignal } from "./start-stop-signal";
import { ReadArtist } from "./types";
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
      from(
        prisma.updateHistory
          .upsert({
            where: { pageURL: p.url },
            create: { pageURL: p.url, hash: p.hash, checkedOn: new Date() },
            update: { pageURL: p.url, hash: p.hash, checkedOn: new Date() },
          })
          .then(() => p),
      ).pipe(
        retry({ count: 50, delay: 5_000 }),
      ),
    ),
  );

const performFullUpdate = () => {
  const [artistURLsFromRatings, albums] = splitRatingsPageData(
    readRatingsPages(),
  );
  const artistURLs = readArtistPages().pipe(
    concatMap((d) =>
      from(
        Object.entries(d.artists).map(([url]) => ({
          type: "artist" as const,
          url,
        })),
      ),
    ),
  );

  const artistsAndAlbumsFromArtistPages = merge(
    artistURLs,
    artistURLsFromRatings,
  ).pipe(
    distinct((v) => v.url),
    filter((v) => v.url !== "/vol5/x.html"),
    toArray(),
    concatMap((as) => {
      console.log(`found ${as.length} unique artists`);
      return from(as);
    }),
    mergeMap((a) => readDataFromArtistPage(a.url), concurrency),
  );

  const [artists, albumsFromArtistsPage] = partition(
    artistsAndAlbumsFromArtistPages,
    (a): a is ReadArtist => a.type === "artist",
  );

  return artists.pipe(
    mergeMap(addArtistImageFromSpotify, concurrency),
    mergeMap(addArtistImageFromDeezer, concurrency),
    concatMap(insertArtist),
    count(),
    map((c) => {
      console.debug(`inserted ${c} artists.`);
    }),
    concatMap(() => merge(albums, albumsFromArtistsPage)),
    distinct((a) => `${a.artistUrl}-${a.name}`),
    mergeMap(addAlbumCoverAndReleaseYearFromMusicBrainz, concurrency),
    mergeMap(addAlbumCoverAndReleaseYearFromSpotify, concurrency),
    mergeMap(addAlbumCoverAndReleaseYearFromDeezer, concurrency),
    mergeMap(addAlbumCoverFromLastFM, concurrency),
    concatMap(insertAlbum),
    count(),
    takeUntil(watchStopSignal()),
    map((c) => {
      console.debug(`inserted ${c} artists.`);
    }),
    finalize(() => {
      markUpdateEnd();
    }),
  );
};

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
