import { bandWithInfluence } from './types';
import { get } from '../shared';
import z from 'zod';

export const getInfluential = () =>
  get('/api/band/influential', z.array(bandWithInfluence));

const distribution = z.record(z.number());

export const getDistribution = () =>
  get('/api/album/distribution', distribution);

export const getBandCount = () => get('/api/band/total', z.number());

export const getAlbumCount = () => get('/api/album/total', z.number());
