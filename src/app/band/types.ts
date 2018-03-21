export {
  Band,
  parseFromRow,
  parseBandSearchRequest
};

import { Album } from '../album';
import { SearchRequest } from './database';

interface Band {
  url: string;
  fullUrl?: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  relatedBands?: Band[];
  albums?: Album[];
}

const parseFromRow = (row: any): Band =>
  ({
    name: row.name,
    url: row.partialurl,
    bio: row.bio,
    imageUrl: row.imageUrl,
    fullUrl: `http://scaruffi.com/${row.partialurl}`,
    albums: [],
    relatedBands: []
  }),
  parseBandSearchRequest = (b: any): SearchRequest => ({
    name: b.name || '',
    page: parseInt(b.page, 10) || 0,
    numberOfResults: Math.min(parseInt(b.numberOfResults, 10) || 10, 50)
  });
