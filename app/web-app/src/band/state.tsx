import {
  State,
  Action,
  makeGetBandSuccess,
  makeGetBandFailed,
  GET_BND,
  GetBandAction,
  makeGetBandAction,
} from './types';
import { call, put, takeEvery, all } from 'redux-saga/effects';
import { LocationChangeAction, LOCATION_CHANGE } from 'connected-react-router';
import { getBand } from './api';
import { takeLatest } from 'redux-saga/effects';
import { history } from '../store';
import { nextState } from '../shared/types/actions';
import { Unpack } from 'shared/types/Other';

const initialState: State = { tag: 'not requested' };

function* fetchBand(action: GetBandAction) {
  try {
    const res: Unpack<typeof getBand> = yield call(getBand, action.payload);
    yield put(makeGetBandSuccess(res));
  } catch (e) {
    yield put(makeGetBandFailed(e));
  }
}

function* dispatchGetBand() {
  yield put(makeGetBandAction(history.location.pathname));
}

function* effects() {
  yield all([
    takeLatest(GET_BND, fetchBand),
    takeEvery(
      (action: LocationChangeAction) =>
        action.type === LOCATION_CHANGE &&
        action.payload.location.pathname.indexOf('/bands') !== -1 &&
        action.payload.location.pathname.split('/').length === 4,
      dispatchGetBand
    ),
  ]);
}

const reducer = nextState<Action, State>(initialState, {
  '[Band] Get band done': (a, _) => a.payload,
  '[Band] Get band': (_a, _s) => ({ tag: 'loading' }),
});

export { reducer, initialState, effects };
