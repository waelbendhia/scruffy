const sleep = (secs: number) =>
  new Promise<void>((res) => {
    setTimeout(() => {
      res(undefined);
    }, secs * 1_000);
  });

const backoff = async <T>(
  req: () => Promise<T>,
  shouldRetry?: (_: unknown) => boolean,
) => {
  let es: unknown[] = [];
  let attempts = 0;
  let sleepTime = 0;

  while (attempts < 10) {
    if (sleepTime === 0) {
      sleepTime = 1;
    } else {
      await sleep(sleepTime);
    }
    try {
      return await req();
    } catch (e) {
      es.push(e);
      if (shouldRetry && !shouldRetry(e)) {
        throw e;
      }
    }

    attempts++;

    sleepTime = Math.min(60, sleepTime * 1.5);
  }

  throw es;
};

export default backoff;
