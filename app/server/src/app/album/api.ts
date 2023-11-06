import express from 'express';
import { getDBFromRes, getHTTPConFromRes, wrapAsync } from '../shared';
import {
  search,
  getRatingDistribution,
  getCount,
  mapLFMAlbums,
} from './database';
import { parseAlbumSearchRequest } from './types';
import { getAlbumsByTag } from '../shared/lastfm';

const router = () =>
  express.Router()
    .get('/', wrapAsync(async (req, res) =>
      res.status(200).json(await search(
        getDBFromRes(res),
        parseAlbumSearchRequest(req.query)
      ))
    ))
    .get('/total', wrapAsync(async (_, res) =>
      res.status(200).json(await getCount(getDBFromRes(res)))
    ))
    .get('/tag/:tag', wrapAsync(async (req, res) => {
      const { timeout, pool } = getHTTPConFromRes(res);
      const lfm = await getAlbumsByTag(req.params.tag, 50, timeout, pool);

      res
        .status(200)
        .json(await mapLFMAlbums(getDBFromRes(res), lfm.albums.album));
    }))
    .get('/distribution', wrapAsync(async (_, res) =>
      res.status(200).json(await getRatingDistribution(getDBFromRes(res)))
    ));

export { router };
