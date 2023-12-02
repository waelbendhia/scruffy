import {
  Prisma,
  PrismaClient,
  prisma as globalPrisma,
} from "@scruffy/database";
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
  catchError,
  pipe,
  Observable,
  tap,
  retry,
  ObservableInput,
} from "rxjs";
import { ReadAlbum, ReadArtist } from "./types";
import { PageReader } from "./page";
import { client } from "./scaruffi";
import { StatusUpdater } from "./update-status";
import { ArtistProvider } from "./providers";

type PageData = Awaited<ReturnType<typeof getPage>>;

export class ArtistReader {
  #providers: ArtistProvider[];
  #statusUpdater: StatusUpdater;
  #pageReader: PageReader;
  #prisma: PrismaClient;

  constructor(
    providers: ArtistProvider[],
    statusUpdater: StatusUpdater,
    pageReader: PageReader,
    prisma?: PrismaClient,
  ) {
    this.#providers = providers;
    this.#statusUpdater = statusUpdater;
    this.#pageReader = pageReader;
    this.#prisma = prisma ?? globalPrisma;
  }

  catchArtistError<T>(
    pageURL: string,
    recoverWith?: T,
  ): (o: Observable<T>) => Observable<T> {
    return pipe(
      catchError((e) => {
        this.#statusUpdater.addError(`artistUrl: ${pageURL}`, e);
        return recoverWith !== undefined ? of(recoverWith) : of();
      }),
    );
  }

  readDataFromArtistPage(url: string) {
    return this.#pageReader
      .readPage(() => from(getPage(url, client)))
      .pipe(
        concatMap(({ data, ...page }) => {
          const artist = readArtistFromArtistPage(url, data);
          if (!artist || !artist?.name) {
            console.debug(`invalid artist ${url}`);
            return of();
          }

          const { albums, ...a } = artist;

          return from([
            { type: "artist" as const, page, ...a } satisfies ReadArtist,
            ...albums.map(
              (album): ReadAlbum => ({
                ...album,
                page,
                type: "album" as const,
                artistName: artist.name,
                artistUrl: a.url,
              }),
            ),
          ]);
        }),
        this.catchArtistError(url),
      );
  }

  withCatch<T extends ReadArtist>(f: (_: T) => ObservableInput<T>) {
    return (a: T) => of(a).pipe(concatMap(f), this.catchArtistError(a.url, a));
  }

  addImage<T extends ReadArtist>(artist: T) {
    // TODO: run these in parallel and find a way to determine the best result.
    let o = of(artist);

    for (const provider of this.#providers) {
      o = o.pipe(
        concatMap(
          this.withCatch<T>(async (a) => {
            const res = await provider.searchArtist(a.name);
            const cover = res.find((a) => !!a.imageURL)?.imageURL;
            return { ...a, imageUrl: a.imageUrl ?? cover };
          }),
        ),
      );
    }
    return o;
  }

  private insertArtistDB<T extends ReadArtist>(artist: T) {
    return this.#prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.updateHistory.upsert({
        where: { pageURL: artist.url },
        create: {
          checkedOn: now,
          hash: artist.page.hash,
          pageURL: artist.url,
        },
        update: {
          checkedOn: now,
          hash: artist.page.hash,
          pageURL: artist.url,
        },
      });

      const createOrUpdateInput: Prisma.ArtistCreateInput &
        Prisma.ArtistUpdateInput = {
        name: artist.name,
        imageUrl: artist.imageUrl,
        lastModified: artist.page.lastModified,
        bio: artist.bio,
        fromUpdate: { connect: { pageURL: artist.url } },
      };

      await tx.artist.upsert({
        where: { url: artist.url },
        create: createOrUpdateInput,
        update: createOrUpdateInput,
      });

      return artist;
    });
  }

  insertArtist<T extends ReadArtist>(a: T) {
    const runInsert = pipe(
      this.withCatch((a) =>
        from(this.insertArtistDB(a)).pipe(retry({ count: 50, delay: 5_000 })),
      ),
      tap(() => {
        this.#statusUpdater.incrementArtist();
      }),
    );

    return runInsert(a);
  }
}

type Volume = Parameters<typeof readArtistsFromVolumePage>[0];

export class ArtistPageReader {
  #pageReader: PageReader;
  #statusUpdater: StatusUpdater;

  constructor(statusUpdater: StatusUpdater, pageReader: PageReader) {
    this.#statusUpdater = statusUpdater;
    this.#pageReader = pageReader;
  }

  catchArtistsPageError<T>(
    pageURL: string,
    recoverWith?: T,
  ): (o: Observable<T>) => Observable<T> {
    return pipe(
      catchError((e) => {
        this.#statusUpdater.addError(`artistsPageURL: ${pageURL}`, e);
        return recoverWith !== undefined ? of(recoverWith) : of();
      }),
    );
  }

  readArtistsPage(
    page: string,
    getter: () => Observable<PageData>,
    reader: (_: string | Buffer) => Record<string, { name: string }>,
  ) {
    return this.#pageReader.readPage(getter).pipe(
      this.catchArtistsPageError(page),
      map(({ data, ...page }) => ({ ...page, artists: reader(data) })),
    );
  }

  readRockPage() {
    return this.readArtistsPage(
      "rock page",
      () => from(getRockPage(client)),
      readArtistsFromRockPage,
    );
  }

  readJazzPage() {
    return this.readArtistsPage(
      "jazz page",
      () => from(getJazzPage(client)),
      readArtistsFromJazzPage,
    );
  }

  readVolumePage(volume: Volume) {
    return this.readArtistsPage(
      `volume ${volume}`,
      () => from(getVolumePage(volume, client)),
      (data) => readArtistsFromVolumePage(volume, data),
    );
  }
}
