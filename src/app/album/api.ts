export { router };

import express from 'express';
import { makeDBConMiddleware } from '../shared';
import { PoolClient } from 'pg';
import { search, getRatingDistribution, getCount } from './database';
import { parseAlbumSearchRequest } from './types';

const router = (getDBCon: () => Promise<PoolClient>) =>
  express.Router()
    .use(makeDBConMiddleware(getDBCon))
    .get(
      '/',
      async (req, res) => {
        try {
          res.json(
            await search(
              res.locals.con as PoolClient,
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
          res.json(await getCount(res.locals.con as PoolClient));
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    )
    .get(
      '/distribution',
      async (_, res) => {
        try {
          res.json(
            await getRatingDistribution(res.locals.con as PoolClient)
          );
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    );
