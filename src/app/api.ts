export { router };
import express from 'express';
import * as Band from './band';
import * as Album from './album';
import path from 'path';
import { PoolClient } from 'pg';


const api = (getDBCon: () => Promise<PoolClient>) =>
  express.Router()
    .use(async (_, res, next) => {
      const con = await getDBCon();
      res.locals.con = con;
      next();
      con.release();
    })
    .use('/band', Band.router(getDBCon))
    .use('/album', Album.router(getDBCon));

const staticRoutes = (publicDirectory: string) =>
  express.Router()
    .get('/', (_, res) =>
      res.sendFile(path.join(publicDirectory, '/index.html'))
    )
    .get('/:page', (req, res) =>
      res.sendFile(path.join(publicDirectory, req.params.page))
    )
    .get('/:folder/:filename', (req, res) =>
      res.sendFile(
        path.join(
          publicDirectory,
          req.params.folder,
          req.params.filename,
        )
      )
    );

const router = (getDBCon: () => Promise<PoolClient>, publicDirectory: string) =>
  express.Router()
    .use('/api/', api(getDBCon))
    .use('/', staticRoutes(publicDirectory));
