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
  ) =>
    app
      .get(
        '/api/band/:volume/:url',
        async (req, res) => {
          const con = await getDBCon();
          try {
            const band = await Band.get(
              con,
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
          con.release();
        }
      )
      .get(
        '/api/ratings/distribution',
        async (req, res) => {
          try {
            const con = await getDBCon(),
              distribution = await Album.getRatingDistribution(con);
            con.release();
            res.json(distribution);
          } catch (e) {
            console.log(e);
            res.status(500);
          }
        }
      )
      .get(
        '/api/bands/total',
        async (req, res) => {
          try {
            const con = await getDBCon(),
              count = await Band.getCount(con);
            con.release();
            res.json(count);
          } catch (e) {
            console.log(e);
            res.status(500);
          }
        }
      )
      .get(
        '/api/bands/influential',
        async (req, res) => {
          try {
            const con = await getDBCon(),
              bands = await Band.getMostInfluential(con);
            con.release();
            res.json(bands);
          } catch (e) {
            console.log(e);
            res.status(500);
          }
        }
      )
      .post(
        '/api/albums/search',
        async (req, res) => {
          try {
            const con = await getDBCon(),
              albums =
                await Album.search(con, parseAlbumSearchRequest(req.body));
            res.json(albums);
          } catch (e) {
            console.log(e);
            res.status(500);
          }
        }
      )
      .get(
        '/api/band',
        async (req, res) => {
          try {
            const con = await getDBCon(),
              bands = await Band.search(con, parseBandSearchRequest(req.query));
            res.json(bands);
          } catch (e) {
            console.log(e);
            res.status(500);
          }
        }
      )
      .get('/', (req, res) =>
        res.sendFile(path.join(publicDirectory, '/index.html'))
      )
      .get('/:page', (req, res) =>
        res.sendFile(path.join(publicDirectory, req.params.page))
      ).get('/:folder/:filename', (req, res) =>
        res.sendFile(
          path.join(
            publicDirectory,
            req.params.folder,
            req.params.filename,
          )
        )
      );
