import { PoolClient } from 'pg';
import * as Album from '../album';
import { parseFromRow, IBand } from './types';
import { getPhotoUrl } from './scraping';
import http from 'http';
import { ILFMArtistPartial } from '../shared/lastfm';

const createBandsQuery =
  `CREATE TABLE bands(
    partialUrl TEXT NOT NULL PRIMARY KEY,
    name TEXT not null,
    bio TEXT,
    imageUrl TEXT
  );`;
const createBand2Bandquery =
  `CREATE TABLE bands2bands(
    urlOfBand TEXT NOT NULL,
    urlOfRelated TEXT NOT NULL,
    CONSTRAINT pk_b2bID PRIMARY KEY (urlOfBand, urlOfRelated),
    FOREIGN KEY (urlOfBand) REFERENCES bands(partialUrl),
    FOREIGN KEY (urlOfRelated) REFERENCES bands(partialUrl)
  );`;


const createTables = (con: PoolClient) =>
  Promise.all(
    [createBandsQuery, createBand2Bandquery]
      .map(query => con.query(query))
  );


const insertPartial = (con: PoolClient, band: IBand) =>
  con.query(
    `INSERT INTO
      bands  (partialUrl, name, bio)
      VALUES ($1,         $2,   $3)
    ON CONFLICT DO NOTHING;`,
    [band.url, band.name, band.bio]
  );

const insertRelation = (con: PoolClient, band: IBand, related: IBand) =>
  con.query(
    `INSERT INTO
      bands2bands (urlOfBand, urlOfRelated)
      VALUES      ($1,        $2)
    ON CONFLICT DO NOTHING;`,
    [band.url, related.url]
  );

const insertOrUpdateFull = async (con: PoolClient, band: IBand) => {
  await insertPartial(con, band);
  await con.query(
    'UPDATE bands SET name = $1, bio = $2 WHERE partialURl = $3',
    [band.name, band.bio, band.url]
  );
  await Promise.all([
    ...(band.albums || []).map(async a => {
      await Album.insert(con, band, a);
      return;
    }),
    ...(band.relatedBands || []).map(
      async b => {
        await insertPartial(con, b);
        await insertRelation(con, b, band);
        return;
      }
    ),
  ]);
  return;
};

const updatePhotoUrl =
  async (con: PoolClient, band: IBand, timeout: number, pool: http.Agent) =>
    await con.query(
      'UPDATE bands SET imageUrl = $1 WHERE partialUrl = $2;',
      [await getPhotoUrl(band, timeout, pool), band.url]
    );

const updateEmptyPhotos =
  async (con: PoolClient, timeout: number, pool: http.Agent) => {
    const { rows } = await con.query(
      `SELECT * FROM bands WHERE imageUrl = '' OR imageUrl IS NULL;`
    );

    await Promise.all(
      rows
        .map(parseFromRow)
        .map(
          b => updatePhotoUrl(con, b, timeout, pool)
            .then(() => console.log(`Got photo for ${b.name}`))
            .catch(e => console.log(`Failed photo for ${b.name} with: ${e}`))
        )
    );
  };

const getRelatedBands = (con: PoolClient, band: IBand) =>
  con.query(
    `SELECT *
		FROM bands
			INNER JOIN bands2bands
			ON bands.partialUrl = bands2bands.urlOfRelated
		WHERE bands2bands.urlOfBand =$1`,
    [band.url]
  )
    .then(({ rows }) => rows.map(parseFromRow));

const get =
  async (con: PoolClient, partialUrl: string): Promise<IBand | null> => {
    const { rows } = await con.query(
      `SELECT * FROM bands WHERE partialUrl =$1`,
      [partialUrl]
    );

    if (rows.length !== 1) { return null; }

    const partialBand = parseFromRow(rows[0]);

    return {
      ...partialBand,
      albums: await Album.find(con, partialBand),
      relatedBands: await getRelatedBands(con, partialBand),
    };
  };


const getCount = (con: PoolClient) =>
  con.query(`SELECT count(*) AS count FROM bands;`)
    .then(({ rows }) => parseInt(rows[0].count, 10));


const getMostInfluential = (con: PoolClient) =>
  con
    .query(
      `SELECT
        count(b2b.urlOfBand) as inf,
        b.name,
        b.partialUrl
      FROM bands b
        INNER JOIN bands2bands b2b
        ON b.partialUrl = b2b.urlOfRelated
      GROUP BY b.partialUrl
      ORDER BY inf DESC LIMIT 21;`
    )
    .then(
      ({ rows }) => rows
        .map(
          row => ({
            ...parseFromRow(row),
            influence: row.inf as number,
          })
        )
    );

interface ISearchRequest {
  name: string;
  numberOfResults: number;
  page: number;
}

const searchRows = (con: PoolClient, req: ISearchRequest) =>
  con.query(
    `SELECT
          b.partialUrl AS partialUrl,
          b.name AS name,
          b.imageUrl AS imageUrl
        FROM bands b
        WHERE
          lower(b.name) ~ lower($1)
        ORDER BY b.name
        LIMIT $2 OFFSET $3;`,
    [
      req.name,
      req.numberOfResults,
      req.page * req.numberOfResults,
    ]
  )
    .then(({ rows }) => rows.map(parseFromRow));

const searchCount =
  (con: PoolClient, req: ISearchRequest) =>
    con.query(
      `SELECT count(*) as count
        FROM bands b
        WHERE lower(b.name) ~ lower($1);`,
      [req.name]
    ).then(({ rows }) => parseInt(rows[0].count, 10));

const mapLFMBands = (con: PoolClient, bands: ILFMArtistPartial[]) =>
  Promise
    .all(
      bands
        .map(
          (a) => searchRows(con, { page: 0, numberOfResults: 1, name: a.name })
        )
    )
    .then(rs =>
      rs
        .filter(r => r.length > 0)
        .map(([b, ..._]) => b)
    );

const search =
  async (con: PoolClient, req: ISearchRequest) => ({
    count: await searchCount(con, req),
    result: await searchRows(con, req),
  });


export {
  createTables,
  insertOrUpdateFull,
  updateEmptyPhotos,
  ISearchRequest,
  get,
  getCount,
  getMostInfluential,
  mapLFMBands,
  search
};
