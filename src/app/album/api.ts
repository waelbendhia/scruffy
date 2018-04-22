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
    .get(
      '/',
      async (req, res) => {
        console.log(req.query);
        try {
          res.json(
            await search(
              getDBFromRes(res),
              parseAlbumSearchRequest(req.query),
            )
          );
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    )
    .get(
      '/total',
      async (_, res) => {
        try {
          res.json(await getCount(getDBFromRes(res)));
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    )
    .get(
      '/tag/:tag',
      async (req, res) => {
        console.log('start');
        const start = new Date();
        try {
          const { timeout, pool } = getHTTPConFromRes(res);
          const lfm = await getAlbumsByTag(req.params.tag, 500, timeout, pool);
          console.log('db', new Date().getTime() - start.getTime(), 'ms');
          res.json(await mapLFMAlbums(getDBFromRes(res), lfm.albums.album));
        } catch (e) {
          console.log(e);
          res.status(500).json('This is bad');
        }
        console.log('exit', new Date().getTime() - start.getTime(), 'ms');
      }
    )
    .get(
      '/distribution',
      async (_, res) => {
        try {
          res.json(
            await getRatingDistribution(getDBFromRes(res))
          );
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    );

export { router };
