import { prisma } from "@scruffy/database";
import { getPage } from "@scruffy/scraper";
import { isAxiosError } from "axios";
import { concatMap, from, of, retry, timer } from "rxjs";

export type PageData = Awaited<ReturnType<typeof getPage>>;

const is404Error = (e: unknown) =>
  isAxiosError(e) && e.response?.status === 404;

/** Read page if no previous updateHistory entry is found or it does not match */
export const readPage = (getter: () => Promise<PageData | null>) =>
  from(getter()).pipe(
    retry({
      count: 10,
      delay: (err, count) =>
        is404Error(err) ? of() : timer(1_000 * 1.5 ** count),
    }),
    concatMap((page) =>
      page === null
        ? of()
        : from(
            prisma.updateHistory.findUnique({ where: { pageURL: page.url } }),
          ).pipe(
            concatMap((prev) => (prev?.hash === page.hash ? of() : of(page))),
          ),
    ),
  );
