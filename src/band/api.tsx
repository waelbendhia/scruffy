import { band, get } from '../shared';
import { BandRequest } from './types';

export const getBand = (req: BandRequest) =>
  get(`/api/bands/${req.vol}/${req.url}`, band);
