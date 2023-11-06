import { band, album, get } from '../shared';
import { SortBy } from '../albums';
import z from 'zod';

const bandSearchResult = z.object({ data: z.array(band) });

export type BandSearchResult = z.infer<typeof bandSearchResult>;

const albumSearchResult = z.object({ data: z.array(album) });

export type AlbumSearchResult = z.infer<typeof albumSearchResult>;

const searchBandsAndAlbums = async (term: string): Promise<any> => {
  term = term.trim();

  if (!term) {
    return [[], []];
  }

  const params = {
    name: term,
    sortBy: SortBy.RATING,
    itemsPerPage: 3,
    includeUnknown: true,
  };

  const x = await Promise.all([
    get('/api/bands', bandSearchResult, params),
    get('/api/albums', albumSearchResult, params),
  ]);

  return x;
};

export { searchBandsAndAlbums };
