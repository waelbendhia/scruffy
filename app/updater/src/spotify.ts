import axios, { AxiosInstance } from "axios";
import { rateLimitClient } from "./rate-limit";

type AccessToken = {
  clientId: string;
  accessToken: string;
  accessTokenExpirationTimestampMs: number;
  isAnonymous: true;
};

const withAnonymousAuth = (client: AxiosInstance) => {
  let token: AccessToken;

  client.interceptors.request.use(async (req) => {
    if ((token?.accessTokenExpirationTimestampMs ?? 0) < new Date().getTime()) {
      console.debug("getting access token");
      const { data } = await axios.get<AccessToken>(
        "https://open.spotify.com/get_access_token",
        {
          params: { reason: "transport", productType: "web_player" },
        },
      );
      token = data;
    }

    req.headers.set("authorization", `Bearer ${token?.accessToken}`);

    return req;
  });

  return client;
};

const client = rateLimitClient(
  withAnonymousAuth(axios.create({ baseURL: "https://api.spotify.com/v1/" })),
  50,
  5000,
);

type SpotifyArtist = {
  genres: string[];
  href: string;
  id: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  name: string;
  popularity: number;
  type: "artist";
  uri: string;
};

type SpotifyAlbum = {
  album_type: "album";
  artists: {
    external_urls: { spotify: string };
    href: string;
    id: string;
    name: string;
    type: "artist";
    uri: string;
  }[];
  available_markets: string[];
  copyrights: { text: string; type: string }[];
  external_ids: { upc: string };
  external_urls: { spotify: string };
  genres: string[];
  href: string;
  id: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  label: string;
  name: string;
  popularity: number;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: "album";
  uri: string;
};

type BestMatch<T> = {
  best_match: { items: T[] };
};

type QueryResult<T extends "album" | "artist"> = T extends "album"
  ? SpotifyAlbum
  : T extends "artist"
  ? SpotifyArtist
  : never;

const getBestMatch = async <T extends "album" | "artist">(
  type: T,
  name: string,
) => {
  const { data } = await client.get<BestMatch<QueryResult<T>>>("search", {
    params: {
      type,
      q: name,
      decorate_restrictions: false,
      best_match: true,
      include_external: "audio",
      limit: 1,
    },
  });

  return data.best_match.items?.[0];
};

export const getSpotifyArtist = async (name: string) =>
  getBestMatch("artist", name);
export const getSpotifyAlbum = async (artist: string, album: string) =>
  getBestMatch("album", `${artist} ${album}`);

export const getBiggestSpotifyImage = (images: SpotifyAlbum["images"]) =>
  images.reduce<SpotifyAlbum["images"][number] | undefined>((prev, cur) => {
    if (!prev || cur.width * cur.height > prev.height * prev.width) {
      return cur;
    }

    return prev;
  }, undefined);
