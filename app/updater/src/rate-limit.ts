import * as axios from "axios";
import { Subject, concatMap, Observable, endWith } from "rxjs";

export const rateLimit =
  <T>(quantity: number, timeMs: number) =>
  (o: Observable<T>) => {
    const sub = new Subject<T>();
    const buff: { ts: number }[] = [];
    o.pipe(
      endWith("close" as const),
      concatMap(async (i) => {
        if (i === "close") {
          sub.complete();
          return;
        }

        const ts = new Date().getTime();
        if (buff.length >= quantity) {
          const first = buff.shift();
          if (first !== undefined) {
            const delay = first.ts - (ts - timeMs);
            if (delay > 0) {
              await new Promise<void>((res) => setTimeout(res, delay));
            }
          }
        }
        sub.next(i);
        buff.push({ ts });
      }),
    ).subscribe(() => {});

    return sub.asObservable();
  };

type Resolver = {
  resolve: () => void;
};

export const rateLimitClient = (
  client: axios.AxiosInstance,
  quantity: number,
  timeMs: number,
) => {
  const subject = new Subject<Resolver>();
  const reqObservabale = subject.pipe(rateLimit(quantity, timeMs));

  client.interceptors.request.use(async (req) => {
    await new Promise<void>((resolve) => {
      subject.next({ resolve });
    });
    return req;
  });

  reqObservabale.subscribe({
    next({ resolve }) {
      resolve();
    },
  });

  return client;
};
