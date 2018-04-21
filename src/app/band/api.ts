import express from 'express';
import { makeDBConMiddleware } from '../shared';
import { PoolClient } from 'pg';
import { search, getMostInfluential, getCount, get } from './database';
import { parseBandSearchRequest } from './types';
import {
  submitCorrection,
  getCorrections,
  submitRevision,
  getRevisions,
} from '../corrections';

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
    )
    .post(
      '/:volume/:url/corrections',
      async (req, res) => {
        try {
          const text = !!req.body && typeof req.body.text === 'string'
            ? req.body.text
            : '';
          if (text) {
            res.json(
              await submitCorrection(
                res.locals.con as PoolClient,
                text,
                `${req.params.volume}/${req.params.url}.html`,
              )
            );
          } else {
            res.status(400).json(`Empty`);
          }
        } catch (e) {
          console.log(e);
          res.status(400).json(`You done goofed.`);
        }
      }
    )
    .get(
      '/:volume/:url/corrections',
      async (req, res) => {
        try {
          res.json(
            await getCorrections(
              res.locals.con as PoolClient,
              `${req.params.volume}/${req.params.url}.html`,
            )
          );
        } catch (e) {
          console.log(e);
          res.status(400).json(`You done goofed.`);
        }
      }
    )
    .post(
      '/:volume/:url/corrections/:id',
      async (req, res) => {
        try {
          const text = !!req.body && typeof req.body.text === 'string'
            ? req.body.text
            : '';
          const correctionID = parseInt(req.params.id, 10);
          if (!!text && !!correctionID) {
            res.json(
              await submitRevision(
                res.locals.con as PoolClient,
                text,
                correctionID,
              )
            );
          } else {
            res.status(400).json(`Empty`);
          }
        } catch (e) {
          console.log(e);
          res.status(400).json(`You done goofed.`);
        }
      }
    )
    .get(
      '/:volume/:url/corrections/:id',
      async (req, res) => {
        try {
          const correctionID = parseInt(req.params.id, 10);
          if (!!correctionID) {
            res.json(
              await getRevisions(res.locals.con as PoolClient, correctionID)
            );
          } else {
            res.status(404).json(`You done goofed.`);
          }
        } catch (e) {
          console.log(e);
          res.status(400).json(`You done goofed.`);
        }
      }
    );

export { router };
