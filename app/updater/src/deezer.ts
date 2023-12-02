import { AxiosInstance } from "axios";

export type DeezerArtistSearchResult = {
  data: DeezerArtist[];
  total: number;
};

export type DeezerArtist = {
  id: string;
  name: string;
  picture: string;
  picture_small: string;
  picture_medium: string;
  picture_big: string;
  picture_xl: string;
  type: "artist";
};

export const searchDeezerArtists = async (
  client: AxiosInstance,
  name: string,
  limit = 10,
) => {
  const resp = await client.get<DeezerArtistSearchResult>(`/search/artist`, {
    params: { q: `artist:"${name}"`, limit },
  });
  return resp.data;
};

export const getBestArtistSearchResult = async (
  client: AxiosInstance,
  name: string,
) => {
  const resp = await searchDeezerArtists(client, name, 1);
  const artist = resp.data?.[0];
  // I do this so that TS can infer the return type as DeezerArtist|undefined
  if (!artist) {
    return undefined;
  }

  return artist;
};

export type DeezerAlbumSearchResult = { data: DeezerAlbum[]; total: number };

export type DeezerAlbum = {
  id: number;
  title: string;
  cover: string;
  cover_small: string;
  cover_medium: string;
  cover_big: string;
  cover_xl: string;
  md5_image: string;
  genre_id: number;
  artist: DeezerArtist;
  type: "album";
};

export const searchDeezerAlbums = async (
  client: AxiosInstance,
  artist: string,
  albumName: string,
) => {
  const resp = await client.get<DeezerAlbumSearchResult>(`/search/album`, {
    params: { q: `artist:"${artist}"album:"${albumName}"` },
  });
  return resp.data;
};

export const getBestAlbumSearchResult = async (
  client: AxiosInstance,
  artist: string,
  albumName: string,
) => {
  const resp = await searchDeezerAlbums(client, artist, albumName);
  const album = resp.data?.[0];
  // I do this so that TS can infer the return type as DeezerArtist|undefined
  if (!album) {
    return undefined;
  }

  return album;
};

type DeezerFullAlbum = DeezerAlbum & {
  upc: string;
  link: string;
  share: string;
  genres: {
    data: {
      id: number;
      name: string;
      picture: string;
      type: "genre";
    }[];
  };
  label: string;
  nb_tracks: number;
  duration: number;
  fans: number;
  release_date: string;
  record_type: string;
  available: boolean;
  tracklist: string;
  explicit_lyrics: boolean;
  explicit_content_lyrics: number;
  explicit_content_cover: number;
  contributors: DeezerArtist[];
};

export const getAlbum = async (client: AxiosInstance, albumID: number) => {
  const { data } = await client.get<DeezerFullAlbum>(`album/${albumID}`);
  return data;
};
