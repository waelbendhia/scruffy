import { prisma } from "@scruffy/database";
import { getPage } from "@scruffy/scraper";
import { isAxiosError } from "axios";
import { concatMap, filter, from, of, retry, timer } from "rxjs";

export type PageData = Awaited<ReturnType<typeof getPage>>;

const is404Error = (e: unknown) =>
  isAxiosError(e) && e.response?.status === 404;

/** Read page if no previous updateHistory entry is found or it does not match */
export const readPage = <T extends PageData>(getter: () => Promise<T | null>) =>
  from(getter()).pipe(
    retry({
      count: 10,
      delay: (err, count) =>
        is404Error(err) ? of() : timer(1_000 * 1.5 ** count),
    }),
    concatMap(async (page) => {
      if (page === null) {
        return null;
      }

      try {
        const prev = await prisma.updateHistory.findUnique({
          where: { pageURL: page.url },
        });
        if (prev?.hash === page.hash) {
          console.debug(`no update for page ${page.url}, skipping.`);
          return null;
        }

        return page;
      } catch (e) {
        console.error(`page check failed`, page.url, page.hash);
        throw e;
      }
    }),
    filter((page): page is NonNullable<typeof page> => page !== null),
  );
