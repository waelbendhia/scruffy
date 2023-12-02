import axios, { AxiosInstance, isAxiosError } from "axios";
import { defer, delay, expand, retry } from "rxjs";
import { Readable } from "stream";

type AccessToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

const getToken = (clientID: string, clientSecret: string) =>
  defer(async () => {
    console.debug("getting token");
    try {
      const res = await axios.post<AccessToken>(
        "https://accounts.spotify.com/api/token",
        `grant_type=client_credentials&client_id=${clientID}&client_secret=${clientSecret}`,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );
      console.log(res.data);
      return res;
    } catch (e) {
      console.error(clientID, clientSecret, e);
      throw e;
    }
  });

const getTokenForever = (clientID: string, clientSecret: string) =>
  defer(() =>
    getToken(clientID, clientSecret).pipe(
      retry({ delay: 10_000 }),
      expand((resp) =>
        getToken(clientID, clientSecret).pipe(
          delay(900 * resp.data.expires_in),
        ),
      ),
    ),
  );

export const withAuth = (
  client: AxiosInstance,
  clientID: string,
  clientSecret: string,
) => {
  let token: AccessToken;
  let resolver: ((_: AccessToken) => void) | undefined;
  const tokenPromise = new Promise<AccessToken>((res) => {
    resolver = res;
  });

  getTokenForever(clientID, clientSecret).subscribe((resp) => {
    token = resp.data;
    if (resolver !== undefined) {
      resolver(resp.data);
      resolver = undefined;
    }
  });

  client.interceptors.request.use(async (req) => {
    req.headers.set(
      "authorization",
      `Bearer ${(token ?? (await tokenPromise)).access_token}`,
    );

    return req;
  });

  return client;
};

export const withWatch429 = (client: AxiosInstance) => {
  const retryStream = new Readable({
    objectMode: true,
    read() {
      return true;
    },
  });
  retryStream.push("send");

  client.interceptors.request.use(async (req) => {
    await new Promise<void>((resolve) =>
      retryStream.once("data", () => resolve()),
    );

    return req;
  });

  client.interceptors.response.use(
    (resp) => resp,
    (err) => {
      if (!isAxiosError(err) || !err.response) {
        throw err;
      }
      const resp = err.response;
      let retryDelay = 0;
      if (resp.status === 429) {
        const retryHeader = resp.headers["retry-after"];
        retryDelay = parseInt(retryHeader ?? "0", 10);
      }

      console.log(`delaying request ${retryDelay}`);

      setTimeout(() => {
        retryStream.push("send");
      }, retryDelay * 1000);

      throw err;
    },
  );

  return client;
};

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
  client: AxiosInstance,
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
  client: AxiosInstance,
  type: T,
  name: string,
) => {
  const data = await search(client, type, name, 1);

  return data.best_match.items?.[0];
};

export type SpotifyArtistSearchResult = BestMatch<
  QueryResult<"artist">,
  "artist"
>;

export const searchSpotifyArtist = async (
  client: AxiosInstance,
  name: string,
) => search(client, "artist", name);

export const getSpotifyArtist = async (client: AxiosInstance, name: string) =>
  getBestMatch(client, "artist", name);

export type SpotifyAlbumSearchResult = BestMatch<QueryResult<"album">, "album">;

export const searchSpotifyAlbums = async (
  client: AxiosInstance,
  artist: string,
  album: string,
) => search(client, "album", `${artist} ${album}`);

export const getSpotifyAlbum = async (
  client: AxiosInstance,
  artist: string,
  album: string,
) => getBestMatch(client, "album", `${artist} ${album}`);

export const getBiggestSpotifyImage = (images: SpotifyAlbum["images"]) =>
  images.reduce<SpotifyAlbum["images"][number] | undefined>((prev, cur) => {
    if (!prev || cur.width * cur.height > prev.height * prev.width) {
      return cur;
    }

    return prev;
  }, undefined);
