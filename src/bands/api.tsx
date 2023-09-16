import { band, get } from '../shared';
import { SearchRequest } from './types';
import z from 'zod';

const searchResult = z.object({ count: z.number(), data: z.array(band) });
export type SearchResult = z.infer<typeof searchResult>;

export const searchBands = (req: SearchRequest) =>
  get('/api/bands', searchResult, req);
