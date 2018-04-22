import express from 'express';
import { getDBFromRes, getHTTPConFromRes } from '../shared';
import {
  search,
  getMostInfluential,
  getCount,
  get,
  mapLFMBands,
} from './database';
import { parseBandSearchRequest } from './types';
import {
  submitCorrection,
  getCorrections,
  submitRevision,
  getRevisions,
} from '../corrections';
import { getLastFMBandData } from '.';
import { isSuccessful, getByTag } from '../shared/lastfm';

const router = () =>
  express.Router()
    .get(
      '/',
      async (req, res) => {
        try {
          res.json(
            await search(getDBFromRes(res), parseBandSearchRequest(req.query)));
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
          res.json(await getMostInfluential(getDBFromRes(res)));
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
        try {
          const { timeout, pool } = getHTTPConFromRes(res);
          const lfm = await getByTag(req.params.tag, 100, timeout, pool);
          res.json(await mapLFMBands(getDBFromRes(res), lfm.topartists.artist));
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
            getDBFromRes(res),
            `${req.params.volume}/${req.params.url}.html`,
          );
          if (!!band) {
            const { timeout, pool } = getHTTPConFromRes(res);
            const lfmBand = await getLastFMBandData(band, timeout, pool);
            res.json({
              ...band,
              relatedBands: isSuccessful(lfmBand)
                ? await mapLFMBands(
                  getDBFromRes(res),
                  lfmBand.artist.similar.artist,
                )
                : []
            });
          } else {
            res.status(404).json('Whoopsie');
          }
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    )
    .get(
      '/:volume/:url/lastfm',
      async (req, res) => {
        try {
          const band = await get(
            getDBFromRes(res),
            `${req.params.volume}/${req.params.url}.html`,
          );
          if (!!band) {
            const { timeout, pool } = getHTTPConFromRes(res);
            res.json(await getLastFMBandData(band, timeout, pool));
          } else {
            res.status(404).json('Whoopsie');
          }
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    )
    .get(
      '/:volume/:url/similar',
      async (req, res) => {
        try {
          const band = await get(
            getDBFromRes(res),
            `${req.params.volume}/${req.params.url}.html`,
          );
          if (!!band) {
            const { timeout, pool } = getHTTPConFromRes(res);
            const lfmBand = await getLastFMBandData(band, timeout, pool);
            res.json(isSuccessful(lfmBand)
              ? await mapLFMBands(
                getDBFromRes(res),
                lfmBand.artist.similar.artist,
              )
              : []
            );
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
                getDBFromRes(res),
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
              getDBFromRes(res),
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
              await submitRevision(getDBFromRes(res), text, correctionID)
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
              await getRevisions(getDBFromRes(res), correctionID)
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
