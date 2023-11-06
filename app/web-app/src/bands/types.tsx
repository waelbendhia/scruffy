import {
  Band,
  Loadable,
  IAction,
  IActionFailable,
  IActionNoPayload,
  noPayloadActionCreator,
  actionCreator,
  failableActionCreator,
} from '../shared';

export type SearchRequest = {
  name: string;
  itemsPerPage: number;
  page: number;
};

export type State = {
  bands: Loadable<Band[]>;
  count: number;
  request: SearchRequest;
  filtersOpen: boolean;
};

const GET_BNDS = '[Bands] Get bands';
const DON_BNDS = '[Bands] Get bands done';
const TOGGLE_FILTERS = '[Bands] Toggle filters';

type ToggleFilters = IActionNoPayload<typeof TOGGLE_FILTERS>;
const makeToggleFiltersAction = noPayloadActionCreator<ToggleFilters>(
  TOGGLE_FILTERS,
);

type GetBandsAction = IAction<typeof GET_BNDS, Partial<SearchRequest>>;
const makeGetBandsAction = actionCreator<GetBandsAction>(GET_BNDS);

interface IGetBandsPayload {
  bands: Band[];
  count: number;
}

type GetBandsDone = IActionFailable<typeof DON_BNDS, IGetBandsPayload>;

const [makeGetBandsSuccess, makeGetBandsFailed] = failableActionCreator<
  GetBandsDone
>(DON_BNDS);

type Action = GetBandsAction | GetBandsDone | ToggleFilters;

export {
  Action,
  GET_BNDS,
  GetBandsAction,
  makeGetBandsAction,
  DON_BNDS,
  makeGetBandsSuccess,
  makeGetBandsFailed,
  TOGGLE_FILTERS,
  ToggleFilters,
  makeToggleFiltersAction,
};
