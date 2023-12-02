import { PrismaClient, prisma as globalPrisma } from "@scruffy/database";
import { getPage } from "@scruffy/scraper";
import { isAxiosError } from "axios";
import {
  Observable,
  RetryConfig,
  concatMap,
  defer,
  delayWhen,
  from,
  identity,
  map,
  of,
  retry,
  tap,
  timer,
} from "rxjs";
import { StatusUpdater } from "./update-status";

export type PageData = Awaited<ReturnType<typeof getPage>>;

const is404Error = (e: unknown) =>
  isAxiosError(e) && e.response?.status === 404;

export class PageReader {
  #getRetryDelay: RetryConfig;
  #findRetryDelay: RetryConfig;
  #statusUpdater: StatusUpdater;
  #prisma: PrismaClient;
  #filterVisited: boolean;

  constructor(
    statusUpdater: StatusUpdater,
    filterVisited = true,
    getRetryDelay?: RetryConfig,
    findRetryDelay?: RetryConfig,
    prisma?: PrismaClient,
  ) {
    this.#getRetryDelay = getRetryDelay ?? {
      count: 10,
      delay: (err, count) => {
        if (count >= 10 || is404Error(err)) {
          return of();
        }

        console.log("retrying page read", count);

        return timer(1_000 * 1.5 ** count);
      },
    };
    this.#findRetryDelay = findRetryDelay ?? { count: 10, delay: 5_000 };
    this.#statusUpdater = statusUpdater;
    this.#prisma = prisma ?? globalPrisma;
    this.#filterVisited = filterVisited;
  }

  private filterUnseen<T extends { url: string; hash: string }>(
    page: T | null,
  ) {
    if (page === null) {
      return of();
    }

    return from(
      this.#prisma.updateHistory.findUnique({ where: { pageURL: page.url } }),
    ).pipe(
      retry(this.#findRetryDelay),
      concatMap((prev) => {
        // I really should be using HEAD to check for last-modified header.
        if (prev?.hash === page.hash) {
          console.debug(`skipping page ${page.url}`);
          return of();
        }

        return of(page);
      }),
    );
  }

  readPage<T extends PageData>(getter: () => Observable<T>) {
    return defer(getter).pipe(
      retry(this.#getRetryDelay),
      this.#filterVisited ? concatMap((a) => this.filterUnseen(a)) : identity,
      delayWhen(async (page) =>
        from(
          this.#prisma.updateHistory.upsert({
            where: { pageURL: page.url },
            create: {
              pageURL: page.url,
              hash: page.hash,
              checkedOn: new Date(),
            },
            update: {
              pageURL: page.url,
              hash: page.hash,
              checkedOn: new Date(),
            },
          }),
        ).pipe(
          retry(this.#findRetryDelay),
          map(() => page),
        ),
      ),
      tap((page) => {
        console.debug(`reading page ${page.url}`);
        this.#statusUpdater.incrementPages();
      }),
    );
  }
}
