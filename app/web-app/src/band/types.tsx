import {
  Band,
  Loadable,
  IAction,
  IActionFailable,
  failableActionCreator,
  actionCreator,
} from '../shared';

export type BandRequest = {
  vol: string;
  url: string;
};

type State = Loadable<Band>;

const GET_BND = '[Band] Get band';
const DON_BND = '[Band] Get band done';

type GetBandAction = IAction<typeof GET_BND, BandRequest>;

const makeGetBandAction = (partialUrl: string) =>
  actionCreator<GetBandAction>('[Band] Get band')({
    vol: partialUrl.split('/')[2],
    url: partialUrl.split('/')[3].split('.')[0],
  });

type GetBandDone = IActionFailable<typeof DON_BND, Band>;
const [makeGetBandSuccess, makeGetBandFailed] = failableActionCreator<
  GetBandDone
>(DON_BND);

type Action = GetBandAction | GetBandDone;

export {
  State,
  Action,
  GET_BND,
  GetBandAction,
  makeGetBandAction,
  DON_BND,
  GetBandDone,
  makeGetBandSuccess,
  makeGetBandFailed,
};
