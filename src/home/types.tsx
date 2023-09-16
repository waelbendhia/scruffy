import {
  band,
  failableActionCreator,
  Loadable,
  IActionNoPayload,
  noPayloadActionCreator,
  IActionFailable,
} from '../shared';
import z from 'zod';

interface IHomeData {
  ratings: { [rating: string]: number };
  influential: BandWithInfluence[];
  bandCount: number;
  albumCount: number;
}

export const bandWithInfluence = band.extend({ influence: z.number() });

export type BandWithInfluence = z.infer<typeof bandWithInfluence>;

export type State = Loadable<IHomeData>;

export const GET_DATA = '[Home] Get data';
export const DON_DATA = '[Home] Get data done';

export type GetDataAction = IActionNoPayload<typeof GET_DATA>;

export const makeGetDataAction =
  noPayloadActionCreator<GetDataAction>(GET_DATA);

export type GetDataDone = IActionFailable<typeof DON_DATA, IHomeData>;

export const [makeGetDataSuccess, makeGetDataFailed] =
  failableActionCreator<GetDataDone>(DON_DATA);

export type Action = GetDataAction | GetDataDone;
