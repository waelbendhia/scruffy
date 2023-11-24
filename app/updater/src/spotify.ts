import axios, { AxiosInstance, isAxiosError } from "axios";
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

export type SpotifyArtist = {
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

export type SpotifyAlbum = {
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

type BestMatch<T, Key extends string> = {
  best_match: { items: T[] };
} & {
  [key in `${Key}s`]: { items: T[]; total: number };
};

type QueryResult<T extends "album" | "artist"> = T extends "album"
  ? SpotifyAlbum
  : T extends "artist"
  ? SpotifyArtist
  : never;

const search = async <T extends "album" | "artist">(
  type: T,
  name: string,
  limit = 10,
) => {
  try {
    const { data } = await client.get<BestMatch<QueryResult<T>, T>>("search", {
      params: {
        type,
        q: name,
        decorate_restrictions: false,
        best_match: true,
        include_external: "audio",
        limit,
      },
    });

    return data;
  } catch (e) {
    if (isAxiosError(e)) {
      console.error("search request failed", e.response?.data, e);
    }
    throw e;
  }
};

const getBestMatch = async <T extends "album" | "artist">(
  type: T,
  name: string,
) => {
  const data = await search(type, name, 1);

  return data.best_match.items?.[0];
};

export type SpotifyArtistSearchResult = BestMatch<
  QueryResult<"artist">,
  "artist"
>;

export const searchSpotifyArtist = async (name: string) =>
  search("artist", name);

export const getSpotifyArtist = async (name: string) =>
  getBestMatch("artist", name);

export type SpotifyAlbumSearchResult = BestMatch<QueryResult<"album">, "album">;

export const searchSpotifyAlbums = async (artist: string, album: string) =>
  search("album", `${artist} ${album}`);

export const getSpotifyAlbum = async (artist: string, album: string) =>
  getBestMatch("album", `${artist} ${album}`);

export const getBiggestSpotifyImage = (images: SpotifyAlbum["images"]) =>
  images.reduce<SpotifyAlbum["images"][number] | undefined>((prev, cur) => {
    if (!prev || cur.width * cur.height > prev.height * prev.width) {
      return cur;
    }

    return prev;
  }, undefined);
