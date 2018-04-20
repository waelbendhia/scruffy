export {
  IBand,
  parseFromRow,
  parseBandSearchRequest
};

import { IAlbum } from '../album';
import { SearchRequest } from './database';

interface IBand {
  url: string;
  fullUrl?: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  relatedBands?: IBand[];
  albums?: IAlbum[];
}

const parseFromRow = (row: any): IBand =>
  ({
    name: row.name,
    url: row.partialurl,
    bio: row.bio,
    imageUrl: row.imageurl,
    fullUrl: `http://scaruffi.com/${row.partialurl}`,
    albums: [],
    relatedBands: []
  }),
  parseBandSearchRequest = (b: any): SearchRequest => ({
    name: b.name || '',
    page: parseInt(b.page, 10) || 0,
    numberOfResults: Math.min(parseInt(b.numberOfResults, 10) || 10, 50)
  });
