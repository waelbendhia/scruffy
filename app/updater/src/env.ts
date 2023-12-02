import { Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const parseIntFromEnv = (key: string) => {
  const env = process.env[key];
  const parsed = env ? parseInt(env) : undefined;
  return parsed && !isNaN(parsed) ? parsed : undefined;
};

export const AlbumProvider = Type.Union([
  Type.Literal("musicbrainz"),
  Type.Literal("spotify"),
  Type.Literal("deezer"),
  Type.Literal("lastfm"),
]);

export type AlbumProvider = Static<typeof AlbumProvider>;

export const albumProviders: Set<AlbumProvider> = new Set(
  process.env.ALBUM_PROVIDERS?.split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((a): a is AlbumProvider => Value.Check(AlbumProvider, a)) ?? [
    "musicbrainz",
  ],
);

export const hasAlbumProvider = (p: AlbumProvider) => albumProviders.has(p);

export const ArtistProvider = Type.Union([
  Type.Literal("spotify"),
  Type.Literal("deezer"),
]);

export type ArtistProvider = Static<typeof ArtistProvider>;

export const artistProviders: Set<ArtistProvider> = new Set(
  process.env.ARTIST_PROVIDERS?.split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((a): a is ArtistProvider => Value.Check(ArtistProvider, a)) ?? [
    "spotify",
    "deezer",
  ],
);

export const hasArtistProvider = (p: ArtistProvider) => artistProviders.has(p);

export const conncurentConnections =
  parseIntFromEnv("CONCURRENT_CONNECTIONS") ?? 10;
export const databaseConcurrency = parseIntFromEnv("DATABASE_CONCURRENCY") ?? 2;
export const concurrency = parseIntFromEnv("CONCURRENCY") ?? 10;
export const recheckDelay = parseIntFromEnv("RECHECK_DELAY") ?? 24 * 3_600;
