import { prisma } from "@scruffy/database";
import { getPage } from "@scruffy/scraper";
import { isAxiosError } from "axios";
import { concatMap, filter, from, of, retry, timer } from "rxjs";
import { incrementPages } from "./update-status";

export type PageData = Awaited<ReturnType<typeof getPage>>;

const is404Error = (e: unknown) =>
  isAxiosError(e) && e.response?.status === 404;

/** Read page if no previous updateHistory entry is found or it does not match */
export const readPage = <T extends PageData>(getter: () => Promise<T | null>) =>
  from(getter()).pipe(
    retry({
      count: 10,
      delay: (err, count) => {
        if (count >= 10 || is404Error(err)) {
          return of();
        }

        console.log("retrying page read", count);

        return timer(1_000 * 1.5 ** count);
      },
    }),
    concatMap((page) => {
      if (page === null) {
        return of();
      }

      return from(
        prisma.updateHistory.findUnique({
          where: { pageURL: page.url },
        }),
      ).pipe(
        retry({ count: 10, delay: 5_000 }),
        concatMap((prev) => {
          // I really should be using HEAD to check for last-modified header.
          if (prev?.hash === page.hash) {
            console.debug(`skipping page ${page.url}`);
            return of();
          }

          incrementPages();
          console.debug(`reading page ${page.url}`);

          return of(page);
        }),
      );
    }),
    filter((page): page is NonNullable<typeof page> => page !== null),
  );
