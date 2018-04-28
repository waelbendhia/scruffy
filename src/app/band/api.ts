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
        await search(getDBFromRes(res), parseBandSearchRequest(req.query))
      )
    )
    .get('/influential', async (_, res) =>
      res.json(await getMostInfluential(getDBFromRes(res)))
    )
    .get('/total', async (_, res) =>
      res.json(await getCount(getDBFromRes(res)))
    )
    .get('/tag/:tag', async (req, res) => {
      const { timeout, pool } = getHTTPConFromRes(res);
      const lfm = await getByTag(req.params.tag, 100, timeout, pool);

      res.json(await mapLFMBands(getDBFromRes(res), lfm.topartists.artist));
    })
    .get('/:volume/:url', async (req, res) => {
      const { timeout, pool } = getHTTPConFromRes(res);
      const band = await get(
        getDBFromRes(res),
        `${req.params.volume}/${req.params.url}.html`
      );

      if (!band) {
        res.status(404).json('Whoopsie');
        return;
      }

      const lfmBand = await getLastFMBandData(band, timeout, pool);

      res.json({
        ...band,
        relatedBands: isSuccessful(lfmBand)
          ? await mapLFMBands(
            getDBFromRes(res),
            lfmBand.artist.similar.artist
          )
          : [],
      });
    })
    .get('/:volume/:url/lastfm', async (req, res) => {
      const { timeout, pool } = getHTTPConFromRes(res);
      const band = await get(
        getDBFromRes(res),
        `${req.params.volume}/${req.params.url}.html`
      );

      if (!band) {
        res.status(404).json('Whoopsie');
        return;
      }

      res.json(await getLastFMBandData(band, timeout, pool));
    })
    .get('/:volume/:url/similar', async (req, res) => {
      const { timeout, pool } = getHTTPConFromRes(res);
      const band = await get(
        getDBFromRes(res),
        `${req.params.volume}/${req.params.url}.html`
      );

      if (!band) {
        res.status(404).json('Whoopsie');
        return;
      }

      const lfmBand = await getLastFMBandData(band, timeout, pool);

      res.json(isSuccessful(lfmBand)
        ? await mapLFMBands(
          getDBFromRes(res),
          lfmBand.artist.similar.artist
        )
        : []
      );
    })
    .post('/:volume/:url/corrections', async (req, res) => {

      const text = !!req.body && typeof req.body.text === 'string'
        ? req.body.text
        : '';

      if (!text) {
        res.status(400).json(`Empty`);
        return;
      }

      res.json(
        await submitCorrection(
          getDBFromRes(res),
          text,
          `${req.params.volume}/${req.params.url}.html`
        )
      );
    })
    .get('/:volume/:url/corrections', async (req, res) =>
      res.json(
        await getCorrections(
          getDBFromRes(res),
          `${req.params.volume}/${req.params.url}.html`
        )
      )
    )
    .post('/:volume/:url/corrections/:id', async (req, res) => {
      const text = !!req.body && typeof req.body.text === 'string'
        ? req.body.text
        : '';
      const correctionID = parseInt(req.params.id, 10);

      if (!text || !correctionID) {
        res.status(400).json(`Empty`);
        return;
      }

      res.json(await submitRevision(getDBFromRes(res), text, correctionID));
    })
    .get('/:volume/:url/corrections/:id', async (req, res) => {
      const correctionID = parseInt(req.params.id, 10);

      if (!correctionID) {
        res.status(404).json(`You done goofed.`);
        return;
      }

      res.json(
        await getRevisions(getDBFromRes(res), correctionID)
      );
    });

export { router };
