import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import { router } from './app';


const port =
  parseInt(
    process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || '',
    10
  ) || 8001,
  ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';


const pool = new Pool({
  user: process.env.PG_USER,
  database: process.env.PG_DATABASE || 'scaruffi',
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT as string, 10) || 5432,
  host: process.env.PG_HOST || 'localhost',
});


express()
  .use(bodyParser.json())
  .use(morgan('combined'))
  .use('/', router(
    () => pool.connect(),
    '/home/wael/node/Scaruffi2.0Node/Scaruffi2.0',
  ))
  .listen(
    port,
    ip,
    () => console.log('Listening on ' + ip + ', port ' + port)
  );

