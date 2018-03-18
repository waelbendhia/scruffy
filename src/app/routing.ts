export { setupRouting };
import express from 'express';
import * as Band from './band';
import * as Album from './album';
import path from 'path';
import { PoolClient } from 'pg';
import { Pool } from 'mysql';

const parseAlbumSearchRequest = (b: any): Album.SearchRequest => ({
  ratingLower: parseInt(b.ratingLower, 10) || 0,
  ratingHigher: parseInt(b.ratingHigher, 10) || 1,
  yearLower: parseInt(b.yearLower, 10) || 0,
  yearHigher: parseInt(b.yearHigher, 10) || 10000,
  includeUnknown: !!b.includeUnknown,
  sortBy: parseInt(b.sortBy, 10) || 10000,
  sortOrderAsc: !!b.sortOrderAsc,
  ...parseBandSearchRequest(b)
}),
  parseBandSearchRequest = (b: any): Band.SearchRequest => ({
    name: b.name || '',
    page: parseInt(b.page, 10) || 0,
    numberOfResults: parseInt(b.numberOfResults, 10) || 10
  });



const setupRouting =
  (
    app: express.Application,
    getDBCon: () => Promise<PoolClient>,
    publicDirectory: string,
  ) => {
    const r = express.Router();
    r.use(async (req, res, next) => {
      const con = await getDBCon();
      res.locals.con = con;
      next();
      con.release();
    });

    r.get(
      '/band/:volume/:url',
      async (req, res) => {
        try {
          const band = await Band.get(
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
    r.get(
      '/ratings/distribution',
      async (req, res) => {
        try {
          res.json(
            await Album.getRatingDistribution(res.locals.con as PoolClient)
          );
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    );
    r.get(
      '/bands/total',
      async (req, res) => {
        try {
          res.json(await Band.getCount(res.locals.con as PoolClient));
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    );
    r.get(
      '/bands/influential',
      async (req, res) => {
        try {
          res.json(await Band.getMostInfluential(res.locals.con as PoolClient));
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    );
    r.post(
      '/albums/search',
      async (req, res) => {
        try {
          res.json(
            await Album.search(
              res.locals.con as PoolClient,
              parseAlbumSearchRequest(req.body),
            )
          );
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    );
    r.get(
      '/band',
      async (req, res) => {
        try {
          res.json(
            await Band.search(
              res.locals.con as PoolClient,
              parseBandSearchRequest(req.query))
          );
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    );
    app.use('/api/', r);
    app.get('/', (req, res) =>
      res.sendFile(path.join(publicDirectory, '/index.html'))
    );
    app.get('/:page', (req, res) =>
      res.sendFile(path.join(publicDirectory, req.params.page))
    );
    app.get('/:folder/:filename', (req, res) =>
      res.sendFile(
        path.join(
          publicDirectory,
          req.params.folder,
          req.params.filename,
        )
      )
    );
    return app;
  };
