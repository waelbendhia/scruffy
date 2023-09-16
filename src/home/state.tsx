import {
  State,
  Action,
  GET_DATA,
  makeGetDataAction,
  makeGetDataSuccess,
  makeGetDataFailed,
} from './types';
import { call, put, takeEvery, all, Effect } from 'redux-saga/effects';
import {
  getInfluential,
  getDistribution,
  getBandCount,
  getAlbumCount,
} from './api';
import { LOCATION_CHANGE, LocationChangeAction } from 'connected-react-router';
import { nextState } from '../shared/types/actions';

const initialState: State = { tag: 'not requested' };

type Unwrap<T extends (...args: any) => any> = ReturnType<T> extends Promise<
  infer R
>
  ? R
  : ReturnType<T>;

function* fetchData(): Generator<Effect, void, any> {
  try {
    const [influential, ratings, bandCount, albumCount]: [
      Unwrap<typeof getInfluential>,
      Unwrap<typeof getDistribution>,
      Unwrap<typeof getBandCount>,
      Unwrap<typeof getAlbumCount>
    ] = yield call(() =>
      Promise.all([
        getInfluential(),
        getDistribution(),
        getBandCount(),
        getAlbumCount(),
      ])
    );

    yield put(
      makeGetDataSuccess({ influential, ratings, bandCount, albumCount })
    );
  } catch (e) {
    yield put(makeGetDataFailed(e));
  }
}

function* dispatchGetData() {
  yield put(makeGetDataAction());
}

function* effects() {
  yield all([
    takeEvery(GET_DATA, fetchData),
    takeEvery(
      (action: LocationChangeAction) =>
        action.type === LOCATION_CHANGE &&
        action.payload.location.pathname === '/',
      dispatchGetData
    ),
  ]);
}

const reducer = nextState<Action, State>(initialState, {
  '[Home] Get data': (_a, _s) => ({ tag: 'loading' }),
  '[Home] Get data done': (a, _) => a.payload,
});

export { reducer, initialState, effects };
