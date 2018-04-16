import { Pool } from 'pg';
import * as Album from './app/album';
import * as Band from './app/band';
import http from 'http';

const pool = new Pool({
  user: process.env.PG_USER,
  database: process.env.PG_DATABASE || 'scaruffi',
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT as string, 10) || 5432,
  host: process.env.PG_HOST || 'localhost',
}),
  httpPool = new http.Agent({
    maxSockets: 10,
    keepAlive: true,
  });

(async () => {
  const con = await pool.connect();
  await Promise.all([
    await Band.updateEmptyPhotos(con, 5000, httpPool),
    await Album.updateEmptyPhotos(con, 5000, httpPool),
  ]);
  con.release();
  httpPool.destroy();
})();
