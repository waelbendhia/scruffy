import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import path from 'path';
import { Pool } from 'pg';
import { Album, Band, resetDatabase } from './app';
const app = express();
const port =
  parseInt(
    process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || '',
    10
  ) || 8001,
  ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
  parseAlbumSearchRequest = (b: any): Album.SearchRequest => ({
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

app.use(bodyParser.json());

app.use(morgan('combined'));
const pool = new Pool({
  user: process.env.PG_USER,
  database: process.env.PG_DATABASE || 'scaruffi',
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT as string, 10) || 5432,
  host: process.env.PG_HOST || 'localhost',
});
(async () => {
  const con = await pool.connect();
  await resetDatabase(await pool.connect());
  con.release();
})();
app.set('con', pool);

function getDBCon() {
  return (app.get('con') as Pool).connect();
}

app.get(
  '/MusicService/band/:volume/:url',
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
);

app.get(
  '/MusicService/ratings/distribution',
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
);

app.get(
  '/MusicService/bands/total',
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
);

app.get(
  '/MusicService/bands/influential',
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
);

app.post(
  '/MusicService/albums/search',
  async (req, res) => {
    try {
      const con = await getDBCon(),
        albums = await Album.search(con, parseAlbumSearchRequest(req.body));
      res.json(albums);
    } catch (e) {
      console.log(e);
      res.status(500);
    }
  }
);

app.post(
  '/MusicService/bands/search',
  async (req, res) => {
    try {
      const con = await getDBCon(),
        bands = await Band.search(con, parseBandSearchRequest(req.body));
      res.json(bands);
    } catch (e) {
      console.log(e);
      res.status(500);
    }
  }
);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Scaruffi2.0/index.html'));
});

app.get('/:page', (req, res) => {
  res.sendFile(path.join(__dirname, '../Scaruffi2.0', req.params.page));
});

app.get('/:folder/:filename', (req, res) =>
  res.sendFile(
    path.join(
      __dirname,
      '../Scaruffi2.0',
      req.params.folder,
      req.params.filename,
    )
  )
);

app.listen(port, ip, () => {
  console.log('Listening on ' + ip + ', port ' + port);
});

// scraper.test()
// scaruffiDB.updateDatabase();
// scaruffiDB.updateEmptyBandPhotos();
