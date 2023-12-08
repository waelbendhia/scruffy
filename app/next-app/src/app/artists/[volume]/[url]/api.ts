import { baseURL } from "@/api";
import { getRedisClient } from "@/redis";
import { API } from "@scruffy/api";

type Artist = API["/artist"]["/:volume/:url"];

type ArtistResponse =
  | (Artist & { status: "ok" })
  | { status: "not found" }
  | { status: "internal error" };

export const getArtist = async ({
  volume,
  url,
}: {
  volume: string;
  url: string;
}): Promise<ArtistResponse> => {
  const resp = await fetch(`${baseURL}/artist/${volume}/${url}`, {
    next: { tags: ["artists"], revalidate: 300 },
  });
  switch (resp.status) {
    case 200:
      const data: API["/artist"]["/:volume/:url"] = await resp.json();

      return { status: "ok", ...data };
    case 404:
      return { status: "not found" };
    default:
      const message = await resp.json();
      console.error("could not get artist", { volume, url }, message);
      return { status: "internal error" };
  }
};

const getArtistNameRedis = async ({
  volume,
  url,
}: {
  volume: string;
  url: string;
}) => {
  const client = getRedisClient();
  if (client) {
    const cached = await client.get(`artist-name-${volume}/${url}.html`);
    if (cached !== null) {
      return { status: "ok" as const, source: "redis" as const, name: cached };
    }
  }

  throw { status: "not found" as const, source: "redis" as const };
};

const getArtistNameAPI = async ({
  volume,
  url,
}: {
  volume: string;
  url: string;
}) => {
  const resp = await fetch(`${baseURL}/artist/${volume}/${url}/name`, {
    next: { tags: ["artists"], revalidate: 7200 },
  });

  switch (resp.status) {
    case 200:
      const data: API["/artist"]["/:volume/:url/name"] = await resp.json();

      return { status: "ok" as const, source: "api" as const, name: data.name };
    case 404:
      throw { status: "not found" as const, source: "api" as const };
    default:
      const message = await resp.json();
      console.error("could not get artist", { volume, url }, message);
      throw { status: "internal error" as const, source: "api" };
  }
};

export const getArtistName = async (args: { volume: string; url: string }) => {
  const res = await Promise.any([
    getArtistNameRedis(args),
    getArtistNameAPI(args),
  ]);

  if (res.source === "redis") {
    return res.name;
  }

  const client = getRedisClient();
  if (!client) {
    return res.name;
  }

  const { volume, url } = args;
  await client.set(`artist-name-${volume}/${url}.html`, res.name);

  return res.name;
};
