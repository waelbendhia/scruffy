import {
  Prisma,
  PrismaClient,
  prisma as globalPrisma,
} from "@scruffy/database";
import {
  getNewRatingsPage,
  getYearRatingsPage,
  readAlbumsFromNewRatingsPage,
  readAlbumsFromYearRatingsPage,
} from "@scruffy/scraper";
import { client } from "./scaruffi";
import {
  Observable,
  ObservableInput,
  catchError,
  concatMap,
  from,
  map,
  mergeMap,
  of,
  partition,
  pipe,
  retry,
  share,
  tap,
} from "rxjs";
import { ReadAlbum } from "./types";
import { StatusUpdater } from "./update-status";
import { AlbumProvider } from "./providers";
import { PageReader } from "./page";

type RatingsPageData = ReturnType<typeof readAlbumsFromNewRatingsPage>;

export class AlbumReader {
  #providers: AlbumProvider[];
  #statusUpdater: StatusUpdater;
  #prisma: PrismaClient;

  constructor(
    providers: AlbumProvider[],
    statusUpdater: StatusUpdater,
    prisma?: PrismaClient,
  ) {
    this.#providers = providers;
    this.#statusUpdater = statusUpdater;
    this.#prisma = prisma ?? globalPrisma;
  }

  private catchAlbumError<T>(
    artistURL: string,
    albumName: string,
    recoverWith?: T,
  ): (o: Observable<T>) => Observable<T> {
    return pipe(
      catchError((e) => {
        this.#statusUpdater.addError(
          `artistURL: ${artistURL}, albumName: ${albumName}`,
          e,
        );
        return !!recoverWith ? of(recoverWith) : of();
      }),
    );
  }

  private withCatch<T extends ReadAlbum>(f: (_: T) => ObservableInput<T>) {
    return (a: T) =>
      of(a).pipe(concatMap(f), this.catchAlbumError(a.artistUrl, a.name, a));
  }

  filterByDate<T extends ReadAlbum>(a: T) {
    return from(
      this.#prisma.album.findUnique({
        where: {
          artistUrl_name: { artistUrl: a.artistUrl, name: a.name },
        },
        select: { fromUpdate: true },
      }),
    ).pipe(
      concatMap((dbVal) =>
        !dbVal ||
        dbVal.fromUpdate.checkedOn.getTime() > a.page.lastModified.getTime()
          ? of()
          : of(a),
      ),
    );
  }

  addImageAndReleaseYear<T extends ReadAlbum>(album: T) {
    // TODO: run these in parallel and find a way to determine the best result.
    let o = of(album);

    for (const provider of this.#providers) {
      o = o.pipe(
        concatMap(
          this.withCatch<T>(async (a) => {
            const res = await provider.searchAlbums(a.artistName, a.name);
            const cover = res.find((a) => !!a.coverURL)?.coverURL;
            const year = res.find((a) => !!a.releaseYear)?.releaseYear;
            return {
              ...a,
              imageUrl: a.imageUrl ?? cover,
              year: a.year ?? year,
            };
          }),
        ),
      );
    }
    return o;
  }

  private async insertAlbumDB<T extends ReadAlbum>({ page, ...album }: T) {
    return this.#prisma.$transaction(async (tx) => {
      const a = await tx.artist.count({ where: { url: album.artistUrl } });
      if (a === 0) {
        console.error(
          `could not find artist ${album.artistUrl} for albums ${album.name}`,
        );
        return { page, ...album };
      }

      await tx.updateHistory.upsert({
        where: { pageURL: page.url },
        create: { pageURL: page.url, hash: page.hash },
        update: {},
      });

      const input: Prisma.AlbumCreateInput = {
        name: album.name,
        year: album.year ?? null,
        rating: album.rating,
        imageUrl: album.imageUrl ?? null,
        artist: { connect: { url: album.artistUrl } },
        fromUpdate: { connect: { pageURL: page.url } },
      };

      await this.#prisma.album.upsert({
        where: {
          artistUrl_name: { artistUrl: album.artistUrl, name: album.name },
        },
        create: input,
        // If this rating was retrieved from the artist page we prefer it over
        // a rating retrieved from a ratings aggregation page.
        update: album.artistUrl === page.url ? input : {},
      });

      return { page, ...album };
    });
  }

  insertAlbum<T extends ReadAlbum>(a: T) {
    const runInsert = pipe(
      this.withCatch((a) =>
        from(this.insertAlbumDB(a)).pipe(retry({ count: 50, delay: 5_000 })),
      ),
      tap(() => {
        this.#statusUpdater.incrementAlbum();
      }),
    );

    return runInsert(a);
  }
}

export const splitRatingsPageData = (
  d: Observable<{
    url: string;
    lastModified: Date;
    hash: string;
    data: RatingsPageData;
  }>,
): [Observable<{ type: "artist"; url: string }>, Observable<ReadAlbum>] => {
  const o = d.pipe(
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
    share({ resetOnRefCountZero: false, resetOnComplete: false }),
  );

  return partition(
    o,
    (a): a is { url: string; type: "artist" } => a.type === "artist",
  );
};

export class AlbumPageReader {
  #pageReader: PageReader;

  constructor(pageReader: PageReader) {
    this.#pageReader = pageReader;
  }

  readYearRatingsPage(year: number) {
    return this.#pageReader
      .readPage(() =>
        from(
          getYearRatingsPage(year, client).then((p) => (p === null ? [] : [p])),
        ).pipe(concatMap((p) => from(p))),
      )
      .pipe(
        catchError((e) => {
          console.error(`could not read ratings page for year ${year}`, e);
          return of();
        }),
        map(({ data, ...page }) => {
          const { artists, albums } = readAlbumsFromYearRatingsPage(year, data);
          return {
            data: {
              artists,
              albums: albums.map(
                (a): ReadAlbum => ({
                  ...a,
                  artistName: artists[a.artistUrl]?.name ?? "",
                  type: "album",
                  page,
                }),
              ),
            },
            ...page,
          };
        }),
      );
  }

  readNewRatingsPage() {
    return this.#pageReader
      .readPage(() => from(getNewRatingsPage(client)))
      .pipe(
        catchError((e) => {
          console.error(`could not read new ratings page`, e);
          return of();
        }),
        map(({ data, ...page }) => ({
          data: readAlbumsFromNewRatingsPage(data),
          ...page,
        })),
      );
  }
}
