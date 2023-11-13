const parseIntFromEnv = (key: string) => {
  const env = process.env[key];
  const parsed = env ? parseInt(env) : undefined;
  return parsed && !isNaN(parsed) ? parsed : undefined;
};

export const conncurentConnections =
  parseIntFromEnv("CONCURRENT_CONNECTIONS") ?? 10;
export const databaseConcurrency = parseIntFromEnv("DATABASE_CONCURRENCY") ?? 2;
export const recheckDelay = parseIntFromEnv("RECHECK_DELAY") ?? 1800;
