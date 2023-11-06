import {
  State,
  Action,
  GET_BNDS,
  GetBandsAction,
  makeGetBandsAction,
  makeGetBandsSuccess,
  makeGetBandsFailed,
} from './types';
import { call, put, takeEvery, all } from 'redux-saga/effects';
import { LocationChangeAction, LOCATION_CHANGE } from 'connected-react-router';
import { searchBands } from './api';
import { select, takeLatest } from 'redux-saga/effects';
import { IState as AppState } from '../store';
import { nextState } from '../shared/types/actions';
import { Unpack } from 'shared/types/Other';

const initialState: State = {
  bands: { tag: 'not requested' },
  count: 0,
  request: {
    page: 0,
    itemsPerPage: 10,
    name: '',
  },
  filtersOpen: false,
};

function* fetchBands(action: GetBandsAction) {
  try {
    const prevReq = yield select((s: AppState) => s.bands.request);
    const res: Unpack<typeof searchBands> = yield call(searchBands, {
      ...prevReq,
      ...action.payload,
    });
    yield put(
      makeGetBandsSuccess({
        bands: res.data,
        count: res.count,
      })
    );
  } catch (e) {
    yield put(makeGetBandsFailed(e));
  }
}

function* dispatchGetBands() {
  const prevReq = yield select((s: AppState) => s.bands.request);
  yield put(makeGetBandsAction(prevReq));
}

function* effects() {
  yield all([
    takeLatest(GET_BNDS, fetchBands),
    takeEvery(
      (action: LocationChangeAction) =>
        action.type === LOCATION_CHANGE &&
        action.payload.location.pathname === '/bands',
      dispatchGetBands
    ),
  ]);
}

const reducer = nextState<Action, State>(initialState, {
  '[Bands] Get bands': (a, s) => ({
    ...s,
    request: { ...s.request, ...a.payload },
    bands: { tag: 'loading' },
  }),
  '[Bands] Get bands done': (a, s) => ({
    ...s,
    count: a.payload.data?.count ?? 0,
    bands:
      a.payload.tag === 'ok'
        ? { tag: 'ok', data: a.payload.data.bands }
        : a.payload,
  }),
  '[Bands] Toggle filters': (_, s) => ({ ...s, filtersOpen: !s.filtersOpen }),
});

export { reducer, initialState, effects };
