import express from 'express';
import * as Band from './band';
import * as Album from './album';
import path from 'path';
import { PoolClient } from 'pg';
import { makeDBConMiddleware, makeHTTPConMiddleware } from './shared';
import http from 'http';

const api = (getDBCon: () => Promise<PoolClient>) =>
  express.Router()
    .use(async (_, res, next) => {
      const con = await getDBCon();

      res.locals.con = con;

      next();
      con.release();
    })
    .use('/band', Band.router())
    .use('/album', Album.router());

const staticRoutes = (publicDirectory: string) =>
  express.Router()
    .get('/', (_, res) =>
      res.sendFile(path.join(publicDirectory, '/index.html'))
    )
    .get('/:page', (req, res) =>
      res.sendFile(path.join(publicDirectory, req.params.page))
    )
    .get('/:folder/:filename', ({ params: { folder, filename } }, res) =>
      res.sendFile(path.join(publicDirectory, folder, filename))
    );

const router = (getDBCon: () => Promise<PoolClient>, publicDirectory: string) =>
  express.Router()
    .use(makeDBConMiddleware(getDBCon))
    .use(makeHTTPConMiddleware(500, new http.Agent({
      maxSockets: 10,
      keepAlive: true,
    })))
    .use('/api/', api(getDBCon))
    .use('/', staticRoutes(publicDirectory));

export { router };
