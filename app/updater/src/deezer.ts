import axios from "axios";

const client = axios.create({
  baseURL: "https://api.deezer.com",
});

type DeezerArtist = {
  id: string;
  name: string;
  picture: string;
  picture_small: string;
  picture_medium: string;
  picture_big: string;
  picture_xl: string;
  type: "artist";
};

export const getBestArtistSearchResult = async (name: string) => {
  const resp = await client.get<{ data: DeezerArtist[] }>(`/search/artist`, {
    params: { q: `artist:"${name}"`, limit: 1 },
  });
  const artist = resp.data.data?.[0];
  // I do this so that TS can infer the return type as DeezerArtist|undefined
  if (!artist) {
    return undefined;
  }

  return artist;
};

type DeezerAlbum = {
  id: number;
  title: "The Eminem Show";
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

export const getBestAlbumSearchResult = async (
  artist: string,
  albumName: string,
) => {
  const resp = await client.get<{ data: DeezerAlbum[] }>(`/search/album`, {
    params: { q: `artist:"${artist}"album:"${albumName}"` },
  });

  const album = resp.data.data?.[0];
  // I do this so that TS can infer the return type as DeezerArtist|undefined
  if (!album) {
    return undefined;
  }

  return album;
};

type DeezerFullAlbum = DeezerAlbum & {
  upc: "724384960650";
  link: "https://www.deezer.com/album/302127";
  share: "https://www.deezer.com/album/302127?utm_source=deezer&utm_content=album-302127&utm_term=0_1699783593&utm_medium=web";
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

export const getAlbum = async (albumID: number) => {
  const { data } = await client.get<DeezerFullAlbum>(`album/${albumID}`);
  return data;
};
