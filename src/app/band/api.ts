export { router };

import express from 'express';
import { makeDBConMiddleware } from '../shared';
import { PoolClient } from 'pg';
import { search, getMostInfluential, getCount, get } from './database';
import { parseBandSearchRequest } from './types';

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
              parseBandSearchRequest(req.query))
          );
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    )
    .get(
      '/influential',
      async (_, res) => {
        try {
          res.json(await getMostInfluential(res.locals.con as PoolClient));
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
      '/:volume/:url',
      async (req, res) => {
        try {
          const band = await get(
            res.locals.con as PoolClient,
            `${req.params.volume}/${req.params.url}.html`,
          );
          if (!!band) {
            res.json(band);
          } else {
            res.status(404).json('Whoopsie');
          }
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    );
