export {
  Band,
  parseFromRow
};

import { Album } from '../album';

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
    url: row.partialUrl,
    bio: row.bio,
    imageUrl: row.imageUrl,
    fullUrl: `http://scaruffi.com/${row.partialUrl}`,
    albums: [],
    relatedBands: []
  });
