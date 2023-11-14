import { bufferTime, delay, pipe, mergeMap, from } from "rxjs";

export const rateLimit = <T>(quantity: number, timeMs: number) =>
  pipe(
    bufferTime<T>(timeMs, null, quantity),
    delay(timeMs),
    mergeMap((buff) => from(buff)),
  );
