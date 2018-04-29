import express from 'express';
import { getDBFromRes, getHTTPConFromRes } from '../shared';
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
    .use((_, res, next) => {
      try {
        next();
      } catch (e) {
        console.log(e);
        res.status(500);
      }
    })
    .get('/', async (req, res) =>
      res.json(
        await search(
          getDBFromRes(res),
          parseAlbumSearchRequest(req.query)
        )
      )
    )
    .get('/total', async (_, res) =>
      res.json(await getCount(getDBFromRes(res)))
    )
    .get('/tag/:tag', async (req, res) => {
      console.log('start');
      const start = new Date();
      const { timeout, pool } = getHTTPConFromRes(res);
      const lfm = await getAlbumsByTag(req.params.tag, 50, timeout, pool);

      res.json(await mapLFMAlbums(getDBFromRes(res), lfm.albums.album));

      console.log('exit', new Date().getTime() - start.getTime(), 'ms');
    })
    .get('/distribution', async (_, res) =>
      res.json(await getRatingDistribution(getDBFromRes(res)))
    );

export { router };
