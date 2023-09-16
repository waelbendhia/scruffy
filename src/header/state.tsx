import {
  IState,
  Action,
  SEARCH,
  Search,
  makeSearchResultSuccess,
  makeSearchResultFailed,
} from './types';
import { call, put, all, takeLatest } from 'redux-saga/effects';
import { searchBandsAndAlbums } from './api';
import { nextState } from '../shared/types/actions';
import { Unpack } from 'shared/types/Other';

const initialState: IState = {
  menuOpen: false,
  open: false,
  search: '',
  bands: [],
  albums: [],
};

function* fetchBands(action: Search) {
  try {
    const res: Unpack<typeof searchBandsAndAlbums> = yield call(
      searchBandsAndAlbums,
      action.payload
    );
    const [bands, albums] = res;
    yield put(makeSearchResultSuccess({ bands, albums }));
  } catch (e) {
    yield put(makeSearchResultFailed(e));
  }
}

function* effects() {
  yield all([takeLatest(SEARCH, fetchBands)]);
}

const reducer = nextState<Action, IState>(initialState, {
  '[Header] Toggle search bar': (_, s) => ({ ...s, open: !s.open }),
  '[Header] Toggle menu': (_, s) => ({ ...s, menuOpen: !s.menuOpen }),
  '[Header] Search': (a, s) => ({ ...s, search: a.payload }),
  '[Header] Search result': (a, s) => ({
    ...s,
    bands: a.payload.tag === 'ok' ? a.payload.data.bands : [],
    albums: a.payload.tag === 'ok' ? a.payload.data.albums : [],
  }),
});

export { reducer, initialState, effects };
