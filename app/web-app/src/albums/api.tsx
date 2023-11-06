import { album, get } from '../shared';
import { SearchRequest } from './types';
import z from 'zod';

export const searchResult = z.object({ count: z.number(), data: z.array(album) });
export type SearchResult = z.infer<typeof searchResult>;

export const searchAlbums = (req: Partial<SearchRequest>) =>
  get('/api/albums', searchResult, {
    ...req,
    sortBy: `${req.sortBy},${req.sortOrderAsc ? 'asc' : 'desc'}`,
  });
