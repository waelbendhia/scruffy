import { getRedisClient } from "@/redis";
import { getPlaiceholder } from "plaiceholder";

const getBlurFromRedis = async (imageUrl: string) => {
  const client = getRedisClient();
  if (!client) {
    throw "Client not configured";
  }

  const blurData = await client.get(`image-blur-${imageUrl}`);
  if (!blurData) {
    throw "blur data not found";
  }

  return blurData;
};

const generateBlurData = async (imageUrl: string) => {
  const res = await fetch(imageUrl, { next: { revalidate: 0 } });
  const buffer = Buffer.from(await res.arrayBuffer());
  const { base64 } = await getPlaiceholder(buffer);

  const client = getRedisClient();
  if (client) {
    await client.set(`image-blur-${imageUrl}`, base64);
  }

  return base64;
};

export const getBlurData = (imageUrl: string) =>
  Promise.any([getBlurFromRedis(imageUrl), generateBlurData(imageUrl)]);
