export {
  createTable,
  insert,
  find,
  updateEmptyPhotos,
  SearchRequest,
  getRatingDistribution,
  search,
  getCount,
};

import { PoolClient } from 'pg';
import { Band } from '../band';
import { Album, parseFromRow } from './types';
import { getPhotoUrl } from './scraping';
import http from 'http';

const SORT_BY_RATING = 0,
  SORT_BY_DATE = 1,
  SORT_BY_ALBUM_NAME = 2,
  SORT_BY_BANDNAME = 3;

const getSortByAsString =
  (
    sortBy: number,
    albumSymbol: string,
    bandSymbol: string,
  ) => {
    switch (sortBy) {
      case SORT_BY_RATING:
        return albumSymbol + '.rating';
      case SORT_BY_DATE:
        return albumSymbol + '.year';
      case SORT_BY_BANDNAME:
        return bandSymbol + '.name';
      case SORT_BY_ALBUM_NAME:
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


const insert = (con: PoolClient, band: Band, album: Album) =>
  (
    con.query(
      `INSERT INTO
        albums (name, year, rating, band)
        VALUES ($1,   $2,   $3,     $4)
      ON CONFLICT DO NOTHING;`,
      [album.name, album.year, album.rating, band.url]
    )
  );

const insertPhotoUrl =
  async (
    con: PoolClient,
    album: Album,
    timeout: number,
    pool: http.Agent,
  ) =>
    await con.query(
      'UPDATE albums SET imageUrl = $1 WHERE name = $2 and band = $3',
      [
        await getPhotoUrl(album, timeout, pool),
        album.name,
        album.band ? album.band.url : ''
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
    ),
      albums: Album[] = res.rows.map(
        r => ({
          ...parseFromRow(r),
          band: {
            name: r.bandName,
            url: r.bandUrl
          }
        })
      );
    await Promise.all(albums.map(a => insertPhotoUrl(con, a, timeout, pool)));
  };

const find = (con: PoolClient, band: Band) =>
  con.query(
    `SELECT * FROM albums where band =$1`,
    [band.url]
  ).then(({ rows }) => rows.map(parseFromRow));



const getRatingDistribution =
  (con: PoolClient): Promise<{ [rating: string]: number }> =>
    con.query(
      `SELECT
        floor(albums.rating*2)/2 as rating,
        count(*) as count
      FROM albums GROUP BY floor(albums.rating*2)/2;`
    ).then(({ rows }) =>
      rows.reduce(
        (p, { rating, count }: { rating: number, count: string }) => ({
          ...p,
          [rating.toFixed(1)]: parseInt(count, 10)
        })
        , {}
      )
    );

interface SearchRequest {
  ratingLower: number;
  ratingHigher: number;
  yearLower: number;
  yearHigher: number;
  includeUnknown: boolean;
  name: string;
  sortBy: number;
  sortOrderAsc: boolean;
  page: number;
  numberOfResults: number;
}

const searchRows =
  (con: PoolClient, req: SearchRequest) =>
    con.query(
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
        (a.year BETWEEN $3 AND $4 OR (a.year = 0 AND $5)) AND
        (
          $6 = '' OR
          lower(a.name) ~ lower($6) OR
          lower(b.name) ~ lower($6)
        )
      ORDER BY
          ${getSortByAsString(req.sortBy, 'a', 'b')}
          ${req.sortOrderAsc ? 'ASC' : 'DESC'}
      LIMIT $7 OFFSET $8;`,
      [
        req.ratingLower,
        req.ratingHigher,
        req.yearLower,
        req.yearHigher,
        req.includeUnknown,
        req.name,
        req.numberOfResults,
        req.page * req.numberOfResults,
      ]
    )
      .then(
        ({ rows }) => rows.map(
          r => ({
            ...parseFromRow(r),
            band: {
              name: r.bandname,
              url: r.bandurl,
              fullurl: `http://scaruffi.com/${r.bandurl}`
            }
          })
        )
      );


const searchCount =
  (con: PoolClient, req: SearchRequest) =>
    con.query(
      `SELECT
          count(*)
        FROM albums a INNER JOIN bands b ON b.partialUrl = a.band
        WHERE
          a.rating BETWEEN $1 AND $2 AND
          (a.year BETWEEN $3 AND $4 OR (a.year = 0 AND $5)) AND
          (
            $6 = '' OR
            lower(a.name) lower($6) OR
            lower(b.name) lower($6)
          );`,
      [
        req.ratingLower,
        req.ratingHigher,
        req.yearLower,
        req.yearHigher,
        req.includeUnknown,
        req.name
      ]
    ).then(({ rows }) => parseInt(rows[0].count, 10));

const search = async (con: PoolClient, req: SearchRequest) => ({
  count: await searchCount(con, req),
  result: await searchRows(con, req)
});

const getCount = (con: PoolClient) =>
  con.query(`SELECT count(*) AS count FROM albums;`)
    .then(({ rows }) => parseInt(rows[0].count, 10));

