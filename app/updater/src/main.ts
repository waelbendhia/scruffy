import { prisma } from "@scruffy/database";
import {
  catchError,
  concatMap,
  endWith,
  from,
  interval,
  last,
  lastValueFrom,
  map,
  merge,
  mergeMap,
  of,
  distinct,
  Observable,
  bufferTime,
  delay,
  pipe,
} from "rxjs";
import {
  conncurentConnections,
  databaseConcurrency,
  recheckDelay,
} from "./env";
import {
  addImagesAndReleaseYears,
  insertArtist,
  readArtist,
  readJazzPage,
  readRockPage,
  readVolumePage,
} from "./artists";

type EndMarker = {
  url: string;
  lastModified: Date;
  hash: string;
  type: "end";
};

const rateLimit = <T>(quantity: number, timeMs: number) =>
  pipe(
    bufferTime<T>(timeMs, null, quantity),
    delay(timeMs),
    mergeMap((buff) => from(buff)),
  );

const mergeMapIfArtist = <T extends { type: "artist" }, R>(
  fn: (_: T) => Observable<R>,
  concurrency: number,
) =>
  mergeMap<
    EndMarker | (T & { type: "artist" }),
    Observable<EndMarker | (R & { type: "artist" })>
  >(
    (x) =>
      x.type === "end"
        ? of(x)
        : fn(x).pipe(map((a) => ({ ...a, type: "artist" as const }))),
    concurrency,
  );

const loadAndInsertFromArtistPages = () => {
  const visited = new Set();

  return merge(
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
    conncurentConnections,
  ).pipe(
    concatMap(({ artists, ...page }) =>
      from(
        Object.entries(artists).map(([url, o]) => ({
          ...o,
          url,
          type: "artist" as const,
        })),
      ).pipe(endWith({ type: "end" as const, ...page })),
    ),
    distinct((v) => `${v.type}-${v.url}`),
    map((x) => {
      if (visited.has(x.url)) {
        console.log(`DUPLICATE: ${x.url}`);
      } else {
        visited.add(x.url);
      }
      return x;
    }),
    // TODO: drop this
    mergeMapIfArtist(
      (a) =>
        from(prisma.artist.count({ where: { url: a.url } })).pipe(
          mergeMap((count) => {
            if (count > 0) {
              console.debug(`${a.url} already downloaded`);
              return of();
            }
            return of(a);
          }),
        ),
      databaseConcurrency,
    ),
    rateLimit(5, 1000),
    mergeMapIfArtist(
      ({ url }) =>
        readArtist(url).pipe(
          catchError((e) => {
            console.debug("error: ", e);
            return of();
          }),
        ),
      conncurentConnections,
    ),
    rateLimit(50, 5000),
    mergeMapIfArtist(
      (a) =>
        addImagesAndReleaseYears(a).pipe(
          catchError((e) => {
            console.debug("error: ", e);
            return of();
          }),
        ),
      conncurentConnections,
    ),
    mergeMap(
      (v) =>
        v.type === "artist"
          ? insertArtist(v).pipe(
              catchError((e) => {
                console.debug("error: ", e);
                return of();
              }),
            )
          : from(
              prisma.updateHistory.upsert({
                where: { pageURL: v.url },
                create: { pageURL: v.url, hash: v.hash },
                update: { hash: v.hash, checkedOn: new Date() },
              }),
            ).pipe(
              catchError((e) => {
                console.debug("error: ", e);
                return of();
              }),
            ),
      databaseConcurrency,
    ),
  );
};

lastValueFrom(
  loadAndInsertFromArtistPages().pipe(
    last(null, null),
    map(() => {
      console.log("check complete");
    }),
    concatMap(() => interval(recheckDelay * 1000)),
    map(() => {
      console.debug("rechecking");
    }),
    concatMap(() => loadAndInsertFromArtistPages()),
    map(() => {
      console.log("check complete");
    }),
  ),
  { defaultValue: null },
).then(() => console.log("exiting"));
