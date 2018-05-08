import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import { router } from './app';
import { uuidMiddleware, getUUID, errorMiddleware } from './app/shared';

const port =
  parseInt(
    process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || '',
    10
  ) || 8001;
const ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

const pool = new Pool({
  user: process.env.PG_USER,
  database: process.env.PG_DATABASE || 'scaruffi',
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT as string, 10) || 5432,
  host: process.env.PG_HOST || 'localhost',
});

morgan.token('request-id', (_, res) => getUUID(res) || '');

express()
  .use(uuidMiddleware)
  .use(bodyParser.json())
  .use(morgan((tokens, req, res) =>
    [
      tokens.method(req, res),
      tokens['request-id'](req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, 'content-length'), '-',
      tokens['response-time'](req, res), 'ms',
    ].join(' ')
  ))
  .use('/', router(
    () => pool.connect(),
    '/home/wael/node/Scaruffi2.0Node/Scaruffi2.0'
  ))
  .use(errorMiddleware)
  .listen(
    port,
    ip,
    () => console.log('Listening on ' + ip + ', port ' + port)
  );

