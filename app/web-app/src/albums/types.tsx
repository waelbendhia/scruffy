import {
  Loadable,
  Album,
  IAction,
  actionCreator,
  IActionFailable,
  failableActionCreator,
  IActionNoPayload,
  noPayloadActionCreator,
} from '../shared';

enum SortBy {
  RATING = 'rating',
  DATE = 'year',
  ALBUM_NAME = 'albumName',
  BAND_NAME = 'bandName',
}

export type SearchRequest = {
  ratingLower: number;
  ratingUpper: number;
  yearLower: number;
  yearHigher: number;
  includeUnknown: boolean;
  name: string;
  sortBy: SortBy;
  sortOrderAsc: boolean;
  page: number;
  itemsPerPage: number;
};

export type State = {
  albums: Loadable<Album[]>;
  count: number;
  request: SearchRequest;
  filtersOpen: boolean;
};

const GET_ALBMS = '[Albums] Get albums';
const DON_ALBMS = '[Albums] Get albums done';
const TOGGLE_FILTERS = '[Albums] Toggle filters';

type GetAlbumsAction = IAction<typeof GET_ALBMS, Partial<SearchRequest>>;

const makeGetAlbumsAction = actionCreator<GetAlbumsAction>(GET_ALBMS);

interface IGetAlbumsPayload {
  albums: Album[];
  count: number;
}

type GetAlbumsDone = IActionFailable<typeof DON_ALBMS, IGetAlbumsPayload>;

const [makeGetAlbumsSuccess, makeGetAlbumsFailed] = failableActionCreator<
  GetAlbumsDone
>(DON_ALBMS);

type ToggleFilters = IActionNoPayload<typeof TOGGLE_FILTERS>;
const makeToggleFiltersAction = noPayloadActionCreator<ToggleFilters>(
  TOGGLE_FILTERS,
);

type Action = GetAlbumsAction | GetAlbumsDone | ToggleFilters;

export {
  SortBy,
  Action,
  GET_ALBMS,
  GetAlbumsAction,
  makeGetAlbumsAction,
  DON_ALBMS,
  GetAlbumsDone,
  makeGetAlbumsSuccess,
  makeGetAlbumsFailed,
  TOGGLE_FILTERS,
  ToggleFilters,
  makeToggleFiltersAction,
};
