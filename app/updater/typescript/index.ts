export * from "./status";
export * from "./provider";

export type ArtistProviders = {
  spotify: boolean;
  deezer: boolean;
};

export type AlbumProviders = {
  musicbrainz: boolean;
  spotify: boolean;
  deezer: boolean;
  lastfm: boolean;
};
