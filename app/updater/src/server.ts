import { prisma, artistDB, Prisma } from "@scruffy/database";
import * as stream from "stream";
import * as crypto from "crypto";
import {
  getArtistFrompage,
  getArtistsFromJazzPage,
  getArtistsFromRockPage,
  getArtistsFromVolumePage,
  getNewPage,
  readArtistsFromNewPage,
} from "@scruffy/scraper";
import { AxiosRequestConfig } from "axios";
import { Agent } from "http";

const parseIntFromEnv = (key: string) => {
  const env = process.env[key];
  const parsed = env ? parseInt(env) : undefined;
  return parsed && !isNaN(parsed) ? parsed : undefined;
};

const conncurentConnections = parseIntFromEnv("CONCURRENT_CONNECTIONS") ?? 20;
const recheckDelay = parseIntFromEnv("RECHECK_DELAY") ?? 300_000;

const sleep = async (secs: number) => {
  new Promise<void>((res) => {
    setTimeout(() => {
      res(undefined);
    }, secs * 1_000);
  });
};

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

    sleepTime = Math.min(60, sleepTime * 1.2);
  }

  throw es;
};

const config: AxiosRequestConfig = {
  httpAgent: new Agent({ keepAlive: true, maxSockets: conncurentConnections }),
};

type MakeKeyNotNull<O extends object, Key extends keyof O> = {
  [k in keyof O]: k extends Key ? Exclude<O[k], undefined | null> : O[k];
};

const loadAllArtists = async () => {
  console.debug("detected first run reading all artists");

  const pageData = await Promise.all([
    backoff(() => getArtistsFromRockPage(config)),
    backoff(() => getArtistsFromJazzPage(config)),
    backoff(() => getArtistsFromVolumePage(1, config)),
    backoff(() => getArtistsFromVolumePage(2, config)),
    backoff(() => getArtistsFromVolumePage(3, config)),
    backoff(() => getArtistsFromVolumePage(4, config)),
    backoff(() => getArtistsFromVolumePage(5, config)),
    backoff(() => getArtistsFromVolumePage(6, config)),
    backoff(() => getArtistsFromVolumePage(7, config)),
    backoff(() => getArtistsFromVolumePage(8, config)),
  ]);

  const artistMap = pageData.reduce<Record<string, { name: string }>>(
    (prev, cur) => ({ ...prev, ...cur }),
    {},
  );

  await insertArtists(artistMap);
};

const insertNewArtists = async (hash?: string) => {
  const page = await getNewPage(config);
  const newHash = crypto.createHash("md5").update(page).digest("hex");
  if (newHash === hash) {
    console.debug("no new artists found");
    return;
  }
  const artists = readArtistsFromNewPage(page);
  await insertArtists(artists);
  return newHash;
};

type WithTS = Awaited<ReturnType<typeof getArtistFrompage>> & { ts: Date };

const insertArtists = async (artists: Record<string, { name: string }>) => {
  const allArtists = Object.entries(artists);

  console.debug(`Found ${allArtists.length} artists.`);

  const str = new stream.Readable({ objectMode: true, read() {} });

  const retrievePromises = allArtists.map(async ([url, { name }]) => {
    try {
      backoff(async () => {
        const artist = await getArtistFrompage(url, config);
        const now = new Date();
        str.push({ ...artist, name, ts: now });
        return;
      });
    } catch (e) {
      console.error(`could not read artist '${name}' from '${url}'`, e);
    }
  });

  // @ts-ignore
  for await (const val of str) {
    const { name, ts, ...artist }: WithTS = val;
    await artistDB.upsert({
      ...artist,
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
      // TODO: should use the last date the page was changed
      lastUpdated: ts,
      lastRetrieved: ts,
    });
  }

  await Promise.all(retrievePromises);
};

const checkAndLoad = async () => {
  const lastCheck = await prisma.updateHistory.findFirst({
    orderBy: { checkedOn: "desc" },
  });
  if (!lastCheck) {
    await loadAllArtists();
  }

  const newHash = await insertNewArtists(lastCheck?.hash);
  if (!!newHash) {
    await prisma.updateHistory.create({
      data: { hash: newHash, checkedOn: new Date() },
    });
  }
};

(async () => {
  await checkAndLoad();

  setInterval(async () => {
    await checkAndLoad();
  }, recheckDelay);
})();
