import { Pool } from 'pg';
import { resetDatabase } from './app';
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
  console.log('Reseting database');
  const con = await pool.connect();
  await resetDatabase(await pool.connect(), 5000, httpPool);
  con.release();
  httpPool.destroy();
})();
