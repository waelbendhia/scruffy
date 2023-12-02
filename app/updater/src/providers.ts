import axios, { AxiosInstance } from "axios";
import { rateLimitClient } from "./rate-limit";
import { searchMusicBrainzAlbums } from "./musicbrainz";
import {
  getBiggestSpotifyImage,
  searchSpotifyAlbums,
  searchSpotifyArtist,
  withAuth,
  withWatch429,
} from "./spotify";
import { searchDeezerAlbums, searchDeezerArtists } from "./deezer";
import { getBiggestLastFMImage, getLastFMAlbum } from "./lastfm";

export type ArtistResult = {
  id: string;
  name: string;
  imageURL?: string;
  confidence: number;
};

export interface ArtistProvider {
  searchArtist(name: string): Promise<ArtistResult[]>;
}

export type AlbumResult = {
  id: string;
  artistName: string;
  name: string;
  coverURL?: string;
  releaseYear?: number;
  confidence: number;
};

export interface AlbumProvider {
  searchAlbums(artist: string, name: string): Promise<AlbumResult[]>;
}

type Rate = { reqs: number; window: number };

export class MusicBrainzProvider implements AlbumProvider {
  #client: AxiosInstance;
  #coverArtClient: AxiosInstance;

  constructor(rateLimit?: Rate) {
    const { reqs, window } = rateLimit ?? { reqs: 1, window: 1000 };

    const userAgent = `scruffy/0.0.0 ( https://scruffy.wbd.tn )`;

    this.#client = rateLimitClient(
      axios.create({
        baseURL: "https://musicbrainz.org/ws/2/",
        headers: { "User-Agent": userAgent },
        params: { fmt: "json" },
      }),
      reqs,
      window,
    );

    this.#coverArtClient = rateLimitClient(
      axios.create({
        baseURL: "https://coverartarchive.org",
        headers: { "User-Agent": userAgent },
        maxRedirects: 0,
        validateStatus: (s) => s < 500,
      }),
      // I don't know if this is rate limited
      reqs,
      window,
    );
  }

  async searchAlbums(artist: string, name: string): Promise<AlbumResult[]> {
    const result = await searchMusicBrainzAlbums(
      this.#client,
      this.#coverArtClient,
      artist,
      name,
    );
    return result.releases.map((rel) => ({
      id: `musicbrainz-${rel.id}`,
      artistName: rel["artist-credit"].join(", "),
      name: rel.title,
      coverURL: rel.front,
      confidence: rel.score,
      year: !!rel.date ? new Date(rel.date).getFullYear() : undefined,
    }));
  }
}

export class SpotifyProvider implements ArtistProvider, AlbumProvider {
  #client: AxiosInstance;

  constructor(clientID: string, clientSecret: string, rate?: Rate) {
    const { reqs, window } = rate ?? { reqs: 30, window: 30_000 };
    this.#client = withWatch429(
      rateLimitClient(
        withAuth(
          axios.create({ baseURL: "https://api.spotify.com/v1/" }),
          clientID,
          clientSecret,
        ),
        reqs,
        window,
      ),
    );
  }

  async searchArtist(name: string): Promise<ArtistResult[]> {
    const res = await searchSpotifyArtist(this.#client, name);
    const artists = [
      ...res.best_match.items,
      ...res.artists.items.filter(
        (a) => !res.best_match.items.some((bm) => bm.id === a.id),
      ),
    ];

    return artists.map((a, i) => ({
      id: `spotify-${a.id}`,
      name: a.name,
      imageURL: getBiggestSpotifyImage(a.images)?.url,
      confidence: Math.max(0, 100 - i),
    }));
  }

  async searchAlbums(artist: string, name: string): Promise<AlbumResult[]> {
    const res = await searchSpotifyAlbums(this.#client, artist, name);
    const albums = [
      ...res.best_match.items,
      ...res.albums.items.filter(
        (a) => !res.best_match.items.some((bm) => bm.id === a.id),
      ),
    ];

    return albums.map((a, i) => ({
      id: `spotify-${a.id}`,
      artistName: a.artists.map((artist) => artist.name).join(", "),
      name: a.name,
      coverURL: getBiggestSpotifyImage(a.images)?.url,
      year: !!a.release_date
        ? new Date(a.release_date).getFullYear()
        : undefined,
      confidence: Math.max(0, 100 - i),
    }));
  }
}

export class DeezerProvider implements ArtistProvider, AlbumProvider {
  #client: AxiosInstance;

  constructor(rate?: Rate) {
    const { reqs, window } = rate ?? { reqs: 50, window: 5000 };
    this.#client = rateLimitClient(
      axios.create({ baseURL: "https://api.deezer.com" }),
      reqs,
      window,
    );
  }

  async searchArtist(name: string): Promise<ArtistResult[]> {
    const res = await searchDeezerArtists(this.#client, name);
    return res.data.map((a, i) => ({
      id: `deezer-${a.id}`,
      name: a.name,
      imageURL: a.picture_xl,
      confidence: Math.max(0, 100 - i),
    }));
  }

  async searchAlbums(artist: string, name: string): Promise<AlbumResult[]> {
    const res = await searchDeezerAlbums(this.#client, artist, name);
    return res.data.map((a, i) => ({
      id: `deezer-${a.id}`,
      artistName: a.artist.name,
      name: a.title,
      coverURL: a.cover_xl,
      confidence: Math.max(0, 100 - i),
    }));
  }
}

export class LastFMProvider implements AlbumProvider {
  #client: AxiosInstance;

  constructor(apiKey: string, rate?: Rate) {
    const { reqs, window } = rate ?? { reqs: 5, window: 1000 };
    this.#client = rateLimitClient(
      axios.create({
        baseURL: "https://ws.audioscrobbler.com/2.0/",
        params: { api_key: apiKey, format: "json" },
      }),
      reqs,
      window,
    );
  }

  async searchAlbums(artist: string, name: string): Promise<AlbumResult[]> {
    const res = await getLastFMAlbum(this.#client, artist, name);
    return res === null
      ? []
      : [
          {
            id: `lastfm-${res.album.mbid}`,
            artistName: res.album.artist,
            name: res.album.name,
            coverURL: getBiggestLastFMImage(res.album.image)?.["#text"],
            confidence: 100,
          },
        ];
  }
}
