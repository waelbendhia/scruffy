import { createClient } from "redis";

const redisURL = process.env.REDIS_URL;
let client: ReturnType<typeof createClient> | undefined;

export const getRedisClient = () => client;

const initRedisClient = async () => {
  if (client !== undefined) {
    return client;
  }

  if (!redisURL) {
    console.debug(
      "Redis not configured, to use Redis set the REDIS_URL env var. Session will be stored in memory.",
    );
    return null;
  }

  try {
    client = createClient({ url: redisURL });
    await client.connect();
  } catch (e) {
    console.warn("connection to redis failed", redisURL, e);
  }

  process.on("SIGINT", async () => {
    await client?.disconnect();
  });
  process.on("SIGTERM", async () => {
    await client?.disconnect();
  });
};

initRedisClient();
