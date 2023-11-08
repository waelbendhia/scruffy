import { Album } from "../album";
import { SearchRequest } from "./database";

export type Band = {
  url: string;
  fullUrl?: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  relatedBands?: Band[];
  albums?: IAlbum[];
};

export const parseFromRow = (row: any): Band => ({
  name: row.name,
  url: row.partialurl,
  bio: row.bio,
  imageUrl: row.imageurl,
  fullUrl: `http://scaruffi.com/${row.partialurl}`,
  albums: [],
  relatedBands: [],
});

export const parseBandSearchRequest = (b: any): ISearchRequest => ({
  name: b.name || "",
  page: parseInt(b.page, 10) || 0,
  numberOfResults: Math.min(parseInt(b.numberOfResults, 10) || 10, 50),
});
