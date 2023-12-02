import { prisma } from "@scruffy/database";
import {
  concatMap,
  from,
  merge,
  mergeMap,
  of,
  distinct,
  repeat,
  delay,
  finalize,
  takeUntil,
  defer,
  filter,
  mergeWith,
  OperatorFunction,
  pipe,
  tap,
  Subject,
  reduce,
} from "rxjs";
import {
  concurrency,
  recheckDelay,
  artistProviders as envArtistProviders,
  albumProviders as envAlbumProviders,
} from "./env";
import { ArtistReader, ArtistPageReader } from "./artists";
import { AlbumReader, AlbumPageReader } from "./album";
import { createAPI } from "./api/server";
import { watchStartSignal, watchStopSignal } from "./start-stop-signal";
import { ReadAlbum, ReadArtist } from "./types";
import { StatusUpdater, UpdateInfoDec } from "./update-status";
import { createClient } from "redis";
import {
  AlbumProvider,
  ArtistProvider,
  DeezerProvider,
  LastFMProvider,
  MusicBrainzProvider,
  SpotifyProvider,
} from "./providers";
import { PageReader } from "./page";
import { rateLimit } from "./rate-limit";

const redisURL = process.env.REDIS_URL;
const redis = redisURL ? createClient({ url: redisURL }) : undefined;
redis
  ?.connect()
  .then(() => {
    console.log("Redis connected");
  })
  .catch((e) => {
    console.error("Redis connection error:", e.message);
  });

const updateSubjectInfo = new Subject<UpdateInfoDec>();
const statusUpdater = new StatusUpdater(updateSubjectInfo, redis);

let deezerProvider: DeezerProvider | undefined;
let spotifyProvider: SpotifyProvider | undefined;

let artistProviders: ArtistProvider[] = [];

for (const p of envArtistProviders) {
  switch (p) {
    case "deezer":
      deezerProvider = new DeezerProvider();
      artistProviders.push(deezerProvider);
      break;
    case "spotify":
      spotifyProvider = new SpotifyProvider(
        process.env.SPOTIFY_CLIENT_ID ?? "",
        process.env.SPOTIFY_CLIENT_SECRET ?? "",
      );
      artistProviders.push(spotifyProvider);
      break;
  }
}

// TODO: filterVisited should be modifiable
const pageReader = new PageReader(statusUpdater, false);

const artistReader = new ArtistReader(
  artistProviders,
  statusUpdater,
  pageReader,
);

const artistPageReader = new ArtistPageReader(statusUpdater, pageReader);

let albumProviders: AlbumProvider[] = [];

let lastFMProvider: LastFMProvider | undefined;
let musicbrainzProvider: MusicBrainzProvider | undefined;

for (const p of envAlbumProviders) {
  switch (p) {
    case "musicbrainz":
      musicbrainzProvider = new MusicBrainzProvider();
      albumProviders.push(musicbrainzProvider);
      break;
    case "spotify":
      if (!spotifyProvider) {
        spotifyProvider = new SpotifyProvider(
          process.env.SPOTIFY_CLIENT_ID ?? "",
          process.env.SPOTIFY_CLIENT_SECRET ?? "",
        );
      }
      albumProviders.push(spotifyProvider);
      break;
    case "deezer":
      if (!deezerProvider) {
        deezerProvider = new DeezerProvider();
      }
      albumProviders.push(deezerProvider);
      break;
    case "lastfm":
      lastFMProvider = new LastFMProvider(process.env.LAST_FM_API_KEY ?? "");
      albumProviders.push(lastFMProvider);
      break;
  }
}

const albumReader = new AlbumReader(albumProviders, statusUpdater);

const albumPageReader = new AlbumPageReader(pageReader);

const range = (start: number, end: number): number[] => {
  let a = [];
  for (let i = start; i < end; i++) {
    a.push(i);
  }
  return a;
};

const readRatingsPages = () =>
  merge(
    ...range(1990, new Date().getFullYear()).map((y) =>
      albumPageReader.readYearRatingsPage(y),
    ),
    albumPageReader.readNewRatingsPage(),
  ).pipe(
    concatMap(async (p) => {
      await prisma.updateHistory.upsert({
        where: { pageURL: p.url },
        create: { pageURL: p.url, hash: p.hash, checkedOn: new Date() },
        update: { pageURL: p.url, hash: p.hash, checkedOn: new Date() },
      });
      return p;
    }),
  );

const readArtistPages = () =>
  merge(
    artistPageReader.readRockPage(),
    artistPageReader.readJazzPage(),
    artistPageReader.readVolumePage(1),
    artistPageReader.readVolumePage(2),
    artistPageReader.readVolumePage(3),
    artistPageReader.readVolumePage(4),
    artistPageReader.readVolumePage(5),
    artistPageReader.readVolumePage(6),
    artistPageReader.readVolumePage(7),
    artistPageReader.readVolumePage(8),
  );

const processArtists = (): OperatorFunction<ReadArtist, ReadArtist> =>
  pipe(
    concatMap(artistReader.filterByDate),
    rateLimit(5, 1000),
    mergeMap((a) => artistReader.addImage(a), concurrency),
    concatMap((a) => artistReader.insertArtist(a)),
    takeUntil(watchStopSignal()),
  );

const processAlbums = (): OperatorFunction<ReadAlbum, ReadAlbum> =>
  pipe(
    concatMap(albumReader.filterByDate),
    rateLimit(5, 1000),
    mergeMap((a) => albumReader.addImageAndReleaseYear(a), concurrency),
    concatMap((a) => albumReader.insertAlbum(a)),
    takeUntil(watchStopSignal()),
  );

const fromURLRecord = (artists: Record<string, { name: string }>) =>
  from(
    Object.entries(artists).map(([url]) => ({ url, type: "artist" as const })),
  );

const performFullUpdate = () =>
  readRatingsPages().pipe(
    takeUntil(watchStopSignal()),
    mergeMap(({ data, ...page }) =>
      merge(
        fromURLRecord(data.artists),
        from(
          data.albums.map((a) => ({
            ...a,
            type: "album" as const,
            artistName: data.artists[a.artistUrl]?.name ?? "",
            page,
          })),
        ),
      ),
    ),
    takeUntil(watchStopSignal()),
    mergeWith(
      readArtistPages().pipe(concatMap((d) => fromURLRecord(d.artists))),
    ),
    distinct((v) =>
      v.type === "artist"
        ? `${v.type}-${v.url}`
        : // I added the rating because some of the album ratings retrieved are
          // out of date, so we keep ones with different ratings and decide what
          // to do with them later on.
          `${v.type}-${v.artistUrl}-${v.name}-${v.rating}`,
    ),
    filter((v) => v.type !== "artist" || v.url !== "/vol5/x.html"),
    mergeMap(
      (a) =>
        a.type === "artist"
          ? artistReader.readDataFromArtistPage(a.url)
          : of(a),
      concurrency,
    ),
    mergeMap(
      (a) =>
        a.type === "artist"
          ? of(a).pipe(processArtists(), takeUntil(watchStopSignal()))
          : of(a),
      concurrency,
    ),
    takeUntil(watchStopSignal()),
    processAlbums(),
    reduce(
      ({ artists, albums }, a) =>
        a.type === "artist"
          ? { artists: artists + 1, albums }
          : { artists, albums: albums + 1 },
      { artists: 0, albums: 0 },
    ),
    tap(({ artists, albums }) => {
      console.debug(`inserted ${artists} artists and ${albums} albums.`);
    }),
  );

const performFullUpdateWithStatusUpdates = () =>
  defer(() => {
    statusUpdater.startUpdate();
    return performFullUpdate();
  }).pipe(
    finalize(() => {
      statusUpdater.endUpdate();
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
  updateSubjectInfo.complete();
  await api.close();
  await prisma.$disconnect();
  if (redis) {
    await redis.disconnect();
  }
  process.exit(0);
};

process.on("SIGTERM", exit);
process.on("SIGINT", exit);

const port = parseInt(process.env.UPDATER_PORT || "", 10) || 8002;
const host = process.env.UPDATER_HOST || "0.0.0.0";
const api = createAPI(
  statusUpdater,
  lastFMProvider,
  spotifyProvider,
  deezerProvider,
  musicbrainzProvider,
);

api.listen({ port, host }, (err) => {
  if (err) {
    api.log.error(err);
    process.exit(1);
  }
});
