import {
  Album,
  Band,
  failableActionCreator,
  IActionNoPayload,
  noPayloadActionCreator,
  IAction,
  actionCreator,
  IActionFailable,
} from '../shared';

const TOGGLE_SEARCH = '[Header] Toggle search bar';
const TOGGLE_MENU = '[Header] Toggle menu';
const SEARCH = '[Header] Search';
const SEARCH_RESULT = '[Header] Search result';

type ToggleSearch = IActionNoPayload<typeof TOGGLE_SEARCH>;
const makeToggleSearchAction = noPayloadActionCreator<ToggleSearch>(
  TOGGLE_SEARCH,
);

type ToggleMenu = IActionNoPayload<typeof TOGGLE_MENU>;
const makeToggleMenuAction = noPayloadActionCreator<ToggleMenu>(TOGGLE_MENU);

type Search = IAction<typeof SEARCH, string>;

const makeSearchAction = actionCreator<Search>(SEARCH);

interface ISearchResultPayload {
  bands: Band[];
  albums: Album[];
}

type SearchResult = IActionFailable<typeof SEARCH_RESULT, ISearchResultPayload>;
const [makeSearchResultSuccess, makeSearchResultFailed] = failableActionCreator<
  SearchResult
>(SEARCH_RESULT);

type Action = ToggleSearch | ToggleMenu | Search | SearchResult;

interface IState {
  menuOpen: boolean;
  open: boolean;
  search: string;
  bands: Band[];
  albums: Album[];
}

export {
  Action,
  ToggleSearch,
  TOGGLE_SEARCH,
  makeToggleSearchAction,
  ToggleMenu,
  TOGGLE_MENU,
  makeToggleMenuAction,
  SEARCH,
  Search,
  makeSearchAction,
  SEARCH_RESULT,
  SearchResult,
  makeSearchResultSuccess,
  makeSearchResultFailed,
  IState,
};
