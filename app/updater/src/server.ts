import { prisma, artistDB, Prisma } from "@scruffy/database";
import * as crypto from "crypto";
import {
  getArtistPage,
  getArtistsFromJazzPage,
  getArtistsFromRockPage,
  getArtistsFromVolumePage,
  getNewPage,
  readArtistFromArtistPage,
  readArtistsFromNewPage,
} from "@scruffy/scraper";
import { AxiosRequestConfig, isAxiosError } from "axios";
import { Agent } from "http";
import * as rxjs from "rxjs";

const parseIntFromEnv = (key: string) => {
  const env = process.env[key];
  const parsed = env ? parseInt(env) : undefined;
  return parsed && !isNaN(parsed) ? parsed : undefined;
};

const conncurentConnections = parseIntFromEnv("CONCURRENT_CONNECTIONS") ?? 20;
const recheckDelay = parseIntFromEnv("RECHECK_DELAY") ?? 300;

const sleep = (secs: number) =>
  new Promise<void>((res) => {
    setTimeout(() => {
      res(undefined);
    }, secs * 1_000);
  });

const backoff = async <T>(
  req: () => Promise<T>,
  shouldRetry?: (_: unknown) => boolean,
) => {
  let es: unknown[] = [];
  let attempts = 0;
  let sleepTime = 0;

  while (attempts < 10) {
    if (sleepTime === 0) {
      sleepTime = 1;
    } else {
      await sleep(sleepTime);
    }
    try {
      return await req();
    } catch (e) {
      es.push(e);
      if (shouldRetry && !shouldRetry(e)) {
        throw e;
      }
    }

    attempts++;

    sleepTime = Math.min(60, sleepTime * 1.5);
  }

  throw es;
};

const config: AxiosRequestConfig = {
  timeout: 5_000,
  httpAgent: new Agent({
    keepAlive: true,
    maxSockets: conncurentConnections,
  }),
};

type MakeKeyNotNull<O extends object, Key extends keyof O> = {
  [k in keyof O]: k extends Key ? Exclude<O[k], undefined | null> : O[k];
};

const insertAllArtists = () =>
  rxjs
    .from([
      () => getArtistsFromRockPage(config),
      () => getArtistsFromJazzPage(config),
      () => getArtistsFromVolumePage(1, config),
      () => getArtistsFromVolumePage(2, config),
      () => getArtistsFromVolumePage(3, config),
      () => getArtistsFromVolumePage(4, config),
      () => getArtistsFromVolumePage(5, config),
      () => getArtistsFromVolumePage(6, config),
      () => getArtistsFromVolumePage(7, config),
      () => getArtistsFromVolumePage(8, config),
    ])
    .pipe(
      rxjs.mergeMap((f) => backoff(f), conncurentConnections),
      rxjs.reduce(
        (prev, cur) => ({ ...prev, ...cur }),
        {} as Record<string, { name: string }>,
      ),
      rxjs.concatMap((as) => Object.entries(as)),
      rxjs.mergeMap(async ([url, { name }]) => {
        const count = await prisma.artist.count({ where: { url } });
        return { url, name, exists: count > 0 };
      }, 2),
      rxjs.filter((v) => !v.exists),
      rxjs.map(({ exists, ...rest }) => rest),
      insertArtists,
    );

const insertNewArtists = (prevHash?: string) =>
  rxjs.from(backoff(() => getNewPage(config))).pipe(
    rxjs.map(({ data, lastModified }) => ({
      hash: crypto.createHash("md5").update(data).digest("hex"),
      lastModified,
      data,
    })),
    rxjs.filter(({ hash }) => {
      if (prevHash === hash) {
        console.debug(`no new artists found`);
        return false;
      }
      return true;
    }),
    rxjs.concatMap(({ data, hash }) =>
      rxjs.from(Object.entries(readArtistsFromNewPage(data))).pipe(
        rxjs.map(([url, { name }]) => ({ url, name })),
        insertArtists,
        rxjs.last(),
        rxjs.map(() => hash),
      ),
    ),
  );

const shouldRetryFetch = (e: unknown) =>
  !isAxiosError(e) || (e.response?.status !== 404 && !(e instanceof TypeError));

const insertArtists = (
  artists: rxjs.Observable<{ url: string; name: string }>,
) =>
  artists.pipe(
    rxjs.mergeMap(async ({ url }) => {
      const result = await backoff(async () => {
        const { data, lastModified } = await getArtistPage(url, config);
        const now = new Date();
        const artist = readArtistFromArtistPage(url, data);
        if (!artist) {
          return null;
        }

        return { ...artist, ts: now, lastModified };
      }, shouldRetryFetch).catch(() => null);
      return result;
    }, conncurentConnections),
    rxjs.mergeMap(async (res) => {
      if (!res) {
        return res;
      }

      const { name, ts, lastModified, ...artist } = res;

      return await artistDB.upsert({
        ...artist,
        lastUpdated: lastModified,
        name,
        firstRetrieved: ts,
        imageUrl: null,
        relatedArtists: [],
        albums: artist.albums
          .filter(
            (a): a is MakeKeyNotNull<typeof a, "rating"> =>
              a.rating !== undefined,
          )
          .map((a) => ({
            ...a,
            year: a.year ?? null,
            rating: new Prisma.Decimal(a.rating),
            imageUrl: null,
            retrieved: ts,
          })),
        lastRetrieved: ts,
      });
    }, 2),
    rxjs.reduce((counter, artist) => {
      if (!!artist) {
        console.debug(`inserted ${artist?.url}:${artist?.name}`);
      } else {
        console.debug(`found skipped insert.`);
      }
      console.debug(`inserted ${counter} artists`);

      return counter + 1;
    }, 0),
  );

const checkAndLoad = () =>
  rxjs
    .from(prisma.updateHistory.findFirst({ orderBy: { checkedOn: "desc" } }))
    .pipe(
      rxjs.concatMap((lastCheck) =>
        !lastCheck
          ? insertAllArtists().pipe(
              rxjs.last(),
              rxjs.map(() => lastCheck),
            )
          : rxjs.of(lastCheck),
      ),
      rxjs.concatMap((lastCheck) => insertNewArtists(lastCheck?.hash)),
      rxjs.concatMap((newHash) =>
        prisma.updateHistory.create({
          data: { hash: newHash, checkedOn: new Date() },
        }),
      ),
    );

(async () => {
  await rxjs.lastValueFrom(checkAndLoad(), { defaultValue: null });

  console.log("first check complete");

  setInterval(async () => {
    await rxjs.lastValueFrom(checkAndLoad(), { defaultValue: null });
  }, recheckDelay * 1000);
})();
