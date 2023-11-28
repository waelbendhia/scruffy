import { Observable } from "rxjs";

export type Observed<O extends Observable<any>> = O extends Observable<infer x>
  ? x
  : never;

export type ReadArtist = {
  name: string;
  bio: string;
  relatedArtists: string[];
  url: string;
  type: "artist";
  imageUrl?: string;
  page: {
    url: string;
    lastModified: Date;
    hash: string;
  };
};

export type ReadAlbum = {
  name: string;
  year?: number | undefined;
  rating: number;
  type: "album";
  page: {
    url: string;
    lastModified: Date;
    hash: string;
  };
  artistUrl: string;
  artistName: string;
  imageUrl?: string;
};
