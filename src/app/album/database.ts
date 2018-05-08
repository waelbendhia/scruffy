import { PoolClient } from 'pg';
import { IBand } from '../band';
import { IAlbum, parseFromRow } from './types';
import { getPhotoUrl } from './scraping';
import http from 'http';
import { ILFMAlbum } from '../shared/lastfm';

enum SortBy {
  RATING = 'rating',
  DATE = 'date',
  ALBUM_NAME = 'albumName',
  BAND_NAME = 'bandName',
}

const getSortByAsString =
  (sortBy: SortBy, albumSymbol: string, bandSymbol: string) => {
    switch (sortBy) {
      case SortBy.RATING:
        return albumSymbol + '.rating';
      case SortBy.DATE:
        return albumSymbol + '.year';
      case SortBy.BAND_NAME:
        return bandSymbol + '.name';
      case SortBy.ALBUM_NAME:
      default:
        return albumSymbol + '.name';
    }
  };

const createAlbumsQuery =
  `CREATE TABLE albums(
    name TEXT NOT NULL,
    year INTEGER,
    rating REAL,
    band TEXT NOT NULL,
    imageUrl TEXT,
    CONSTRAINT pk_albumID PRIMARY KEY (name, band),
    FOREIGN KEY (band) REFERENCES bands(partialUrl)
  );`;

const createTable = (con: PoolClient) => con.query(createAlbumsQuery);


const insert = (con: PoolClient, band: IBand, album: IAlbum) =>
  con.query(
    `INSERT INTO
      albums (name, year, rating, band)
      VALUES ($1,   $2,   $3,     $4)
    ON CONFLICT DO NOTHING;`,
    [album.name, album.year, album.rating, band.url]
  );

const insertPhotoUrl =
  async (con: PoolClient, album: IAlbum, timeout: number, pool: http.Agent) =>
    await con.query(
      'UPDATE albums SET imageUrl = $1 WHERE name = $2 and band = $3',
      [
        await getPhotoUrl(album, timeout, pool),
        album.name,
        album.band ? album.band.url : '',
      ]
    );

const updateEmptyPhotos =
  async (con: PoolClient, timeout: number, pool: http.Agent) => {
    const res = await con.query(
      `SELECT
        a.name AS name,
        a.year AS year,
        a.rating AS rating,
        a.band AS bandUrl,
        b.name AS bandName
      FROM albums a INNER JOIN bands b ON a.band = b.partialUrl
      WHERE a.imageUrl = '' OR a.imageUrl IS NULL;`
    );

    const albums: IAlbum[] = res.rows.map(
      r => ({
        ...parseFromRow(r),
        band: { name: r.bandname, url: r.bandurl },
      })
    );

    await Promise.all(albums.map(
      a => insertPhotoUrl(con, a, timeout, pool)
        .then(() => console.log(`Got photo for ${a.name}`))
        .catch(e => console.log(`Failed photo for ${a.name} with: ${e}`))
    ));
  };

const find = (con: PoolClient, band: IBand) =>
  con
    .query(`SELECT * FROM albums where band =$1`, [band.url])
    .then(res => res.rows.map(parseFromRow));



const getRatingDistribution =
  (con: PoolClient): Promise<{ [rating: string]: number }> =>
    con
      .query(
        `SELECT
          floor(albums.rating*2)/2 as rating,
          count(*) as count
        FROM albums GROUP BY floor(albums.rating*2)/2;`
      )
      .then(res =>
        res.rows.reduce(
          (p, row: { rating: number, count: string }) => ({
            ...p,
            [row.rating.toFixed(1)]: parseInt(row.count, 10),
          }),
          {}
        )
      );

interface ISearchRequest {
  ratingLower: number;
  ratingHigher: number;
  yearLower: number;
  yearHigher: number;
  includeUnknown: boolean;
  name: string;
  sortBy: SortBy;
  sortOrderAsc: boolean;
  page: number;
  numberOfResults: number;
}

const searchRows =
  (con: PoolClient, req: ISearchRequest) =>
    con
      .query(
        `SELECT
          a.name AS name,
          a.imageUrl AS imageUrl,
          a.year AS year,
          a.rating AS rating,
          b.name AS bandname,
          b.partialUrl AS bandurl
        FROM albums a INNER JOIN bands b ON b.partialUrl = a.band
        WHERE
          a.rating BETWEEN $1 AND $2 AND
          (a.year BETWEEN $3 AND $4 AND a.year != 0 OR (a.year = 0 AND $5)) AND
          (
            $6 = '' OR
            lower(a.name) ~ lower($6) OR
            lower(b.name) ~ lower($6)
          )
        ORDER BY
            ${getSortByAsString(req.sortBy, 'a', 'b')}
            ${req.sortOrderAsc ? 'ASC' : 'DESC'},
            a.name
        LIMIT $7 OFFSET $8;`,
        [
          req.ratingLower,
          req.ratingHigher,
          req.yearLower,
          req.yearHigher,
          req.includeUnknown,
          req.name.replace(/\(/g, '\\(').replace(/\)/g, '\\)'),
          req.numberOfResults,
          req.page * req.numberOfResults,
        ]
      )
      .then(res => res.rows.map(
        r => ({
          ...parseFromRow(r),
          band: {
            name: r.bandname,
            url: r.bandurl,
            fullurl: `http://scaruffi.com/${r.bandurl}`,
          },
        })
      ));


const searchCount =
  (con: PoolClient, req: ISearchRequest) =>
    con
      .query(
        `SELECT
          count(*)
        FROM albums a INNER JOIN bands b ON b.partialUrl = a.band
        WHERE
          a.rating BETWEEN $1 AND $2 AND
          (a.year BETWEEN $3 AND $4 AND a.year != 0 OR (a.year = 0 AND $5)) AND
          (
            $6 = '' OR
            lower(a.name) ~ lower($6) OR
            lower(b.name) ~ lower($6)
          );`,
        [
          req.ratingLower,
          req.ratingHigher,
          req.yearLower,
          req.yearHigher,
          req.includeUnknown,
          req.name.replace(/\(/g, '\\(').replace(/\)/g, '\\)'),
        ]
      )
      .then(res => parseInt(res.rows[0].count, 10));

const search = (con: PoolClient, req: ISearchRequest) =>
  Promise
    .all([searchCount(con, req), searchRows(con, req)])
    .then(([count, result]) => ({ count, result }));


const getCount = (con: PoolClient) =>
  con
    .query(`SELECT count(*) AS count FROM albums;`)
    .then(res => parseInt(res.rows[0].count, 10));

const matchNames = (con: PoolClient, names: string[]) =>
  con
    .query(
      `SELECT
        a.name AS name,
        a.imageUrl AS imageUrl,
        a.year AS year,
        a.rating AS rating,
        b.name AS bandname,
        b.partialUrl AS bandurl
      FROM albums a INNER JOIN bands b ON b.partialUrl = a.band
      WHERE lower(a.name) = ANY ($1);`,
      [names.map(s => s.toLocaleLowerCase())]
    )
    .then(res => res.rows.map(
      r => ({
        ...parseFromRow(r),
        band: {
          name: r.bandname,
          url: r.bandurl,
          fullurl: `http://scaruffi.com/${r.bandurl}`,
        },
      })
    ));

const mapLFMAlbums = (con: PoolClient, albums: ILFMAlbum[]) =>
  matchNames(con, albums.map(a => a.name))
    .then(as => as.sort((a, b) => b.rating - a.rating));

export {
  createTable,
  insert,
  find,
  updateEmptyPhotos,
  ISearchRequest,
  getRatingDistribution,
  search,
  getCount,
  mapLFMAlbums,
};
