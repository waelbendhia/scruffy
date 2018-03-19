export {
  Album,
  parseFromRow,
  parseAlbumSearchRequest,
};

import { Band, parseBandSearchRequest } from '../band';
import { SearchRequest } from './database';

interface Album {
  name: string;
  year: number;
  rating: number;
  imageUrl: string;
  band?: Band;
}

const parseFromRow = (row: any): Album =>
  ({
    name: row.name,
    year: row.year,
    rating: row.rating,
    imageUrl: row.imageUrl
  }),
  parseAlbumSearchRequest = (b: any): SearchRequest => ({
    ratingLower: parseInt(b.ratingLower, 10) || 0,
    ratingHigher: parseInt(b.ratingHigher, 10) || 10,
    yearLower: parseInt(b.yearLower, 10) || 0,
    yearHigher: parseInt(b.yearHigher, 10) || 10000,
    includeUnknown: !!b.includeUnknown,
    sortBy: parseInt(b.sortBy, 10) || 10000,
    sortOrderAsc:
      typeof b.sortOrderAsc === 'undefined'
        ? true
        : !!b.sortOrderAsc,
    ...parseBandSearchRequest(b)
  });
