const parseIntFromEnv = (key: string) => {
  const env = process.env[key];
  const parsed = env ? parseInt(env) : undefined;
  return parsed && !isNaN(parsed) ? parsed : undefined;
};

export type AlbumProvider = "musicbrainz" | "spotify" | "deezer" | "lastfm";

export const albumProviders: Set<AlbumProvider> = new Set(
  process.env.ALBUM_PROVIDERS?.split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(
      (a): a is AlbumProvider =>
        a === "musicbrainz" ||
        a === "spotify" ||
        a === "deezer" ||
        a === "lastfm",
    ) ?? ["musicbrainz"],
);

export const hasAlbumProvider = (p: AlbumProvider) => albumProviders.has(p);

export type ArtistProvider = "spotify" | "deezer";

export const artistProviders: Set<ArtistProvider> = new Set(
  process.env.ARTIST_PROVIDERS?.split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((a): a is ArtistProvider => a === "spotify" || a === "deezer") ?? [
    "spotify",
    "deezer",
  ],
);

export const hasArtistProvider = (p: ArtistProvider) => albumProviders.has(p);

export const conncurentConnections =
  parseIntFromEnv("CONCURRENT_CONNECTIONS") ?? 10;
export const databaseConcurrency = parseIntFromEnv("DATABASE_CONCURRENCY") ?? 2;
export const concurrency = parseIntFromEnv("CONCURRENCY") ?? 10;
export const recheckDelay = parseIntFromEnv("RECHECK_DELAY") ?? 1800;
