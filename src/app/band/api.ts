import express from 'express';
import { getDBFromRes, getHTTPConFromRes, wrapAsync } from '../shared';
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
    .get('/', wrapAsync(async (req, res) => {
      res.status(200).json(await search(
        getDBFromRes(res),
        parseBandSearchRequest(req.query)
      ));
    }))
    .get('/influential', wrapAsync(async (_, res) =>
      res.status(200).json(await getMostInfluential(getDBFromRes(res)))
    ))
    .get('/total', wrapAsync(async (_, res) =>
      res.status(200).json(await getCount(getDBFromRes(res)))
    ))
    .get('/tag/:tag', wrapAsync(async (req, res) => {
      const { timeout, pool } = getHTTPConFromRes(res);
      const lfm = await getByTag(req.params.tag, 100, timeout, pool);

      res
        .status(200)
        .json(await mapLFMBands(getDBFromRes(res), lfm.topartists.artist));
    }))
    .get('/:volume/:url', wrapAsync(async (req, res) => {
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
      const relatedBands = isSuccessful(lfmBand)
        ? await mapLFMBands(getDBFromRes(res), lfmBand.artist.similar.artist)
        : [];

      res.status(200).json({ ...band, relatedBands });
    }))
    .get('/:volume/:url/lastfm', wrapAsync(async (req, res) => {
      const { timeout, pool } = getHTTPConFromRes(res);
      const band = await get(
        getDBFromRes(res),
        `${req.params.volume}/${req.params.url}.html`
      );

      if (!band) {
        res.status(404).json('Whoopsie');
        return;
      }

      res.status(200).json(await getLastFMBandData(band, timeout, pool));
    }))
    .get('/:volume/:url/similar', wrapAsync(async (req, res) => {
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

      res.status(200).json(isSuccessful(lfmBand)
        ? await mapLFMBands(getDBFromRes(res), lfmBand.artist.similar.artist)
        : []
      );
    }))
    .post('/:volume/:url/corrections', wrapAsync(async (req, res) => {

      const text = !!req.body && typeof req.body.text === 'string'
        ? req.body.text
        : '';

      if (!text) {
        res.status(400).json(`Empty`);
        return;
      }

      res.status(200).json(
        await submitCorrection(
          getDBFromRes(res),
          text,
          `${req.params.volume}/${req.params.url}.html`
        )
      );
    }))
    .get('/:volume/:url/corrections', wrapAsync(async (req, res) =>
      res.status(200).json(
        await getCorrections(
          getDBFromRes(res),
          `${req.params.volume}/${req.params.url}.html`
        )
      )
    ))
    .post('/:volume/:url/corrections/:id', wrapAsync(async (req, res) => {
      const text = !!req.body && typeof req.body.text === 'string'
        ? req.body.text
        : '';
      const correctionID = parseInt(req.params.id, 10);

      if (!text || !correctionID) {
        res.status(400).json(`Empty`);
        return;
      }

      res
        .status(200)
        .json(await submitRevision(getDBFromRes(res), text, correctionID));
    }))
    .get('/:volume/:url/corrections/:id', wrapAsync(async (req, res) => {
      const correctionID = parseInt(req.params.id, 10);

      if (!correctionID) {
        res.status(404).json(`You done goofed.`);
        return;
      }

      res.status(200).json(
        await getRevisions(getDBFromRes(res), correctionID)
      );
    }));

export { router };
