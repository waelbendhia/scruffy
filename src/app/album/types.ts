export {
  IAlbum,
  parseFromRow,
  parseAlbumSearchRequest,
};

import { IBand, parseBandSearchRequest } from '../band';
import { ISearchRequest } from './database';

interface IAlbum {
  name: string;
  year: number;
  rating: number;
  imageUrl: string;
  band?: IBand;
}

const parseFromRow = (row: any): IAlbum =>
  ({
    name: row.name,
    year: row.year,
    rating: row.rating,
    imageUrl: row.imageurl,
  }),
  parseAlbumSearchRequest = (b: any): ISearchRequest => ({
    ratingLower: parseFloat(b.ratingLower) || 0,
    ratingHigher: parseFloat(b.ratingHigher) || 10,
    yearLower: parseInt(b.yearLower, 10) || 0,
    yearHigher: parseInt(b.yearHigher, 10) || 10000,
    includeUnknown: b.includeUnknown === 'true',
    sortBy: b.sortBy,
    sortOrderAsc: b.sortOrderAsc === 'true',
    ...parseBandSearchRequest(b)
  });
