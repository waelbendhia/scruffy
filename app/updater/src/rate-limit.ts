import * as axios from "axios";
import {
  bufferTime,
  delay,
  pipe,
  mergeMap,
  from,
  Subject,
  concatMap,
  of,
} from "rxjs";

export const rateLimit = <T>(quantity: number, timeMs: number) =>
  pipe(
    bufferTime<T>(timeMs, null, quantity),
    concatMap((buff) => of(buff).pipe(delay(timeMs))),
    mergeMap((buff) => from(buff)),
  );

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
