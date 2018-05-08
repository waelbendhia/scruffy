import { PoolClient } from 'pg';
import {
  parseCorrectionFromRow,
  parseRevisionFromRow,
} from './types';

const createCorrectionsQuery =
  `CREATE TABLE corrections(
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    submitted_on TIMESTAMP WITH TIME ZONE DEFAULT now(),
    band TEXT NOT NULL,
    FOREIGN KEY (band) REFERENCES bands(partialUrl)
  );`;
const createRevisionsQuery =
  `CREATE TABLE revisions(
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    correction INT NOT NULL,
    submitted_on TIMESTAMP WITH TIME ZONE DEFAULT now(),
    FOREIGN KEY (correction) REFERENCES corrections(id)
  );`;


const createTables = (con: PoolClient) =>
  Promise.all(
    [createCorrectionsQuery, createRevisionsQuery]
      .map(query => con.query(query))
  );


const submitCorrection = (con: PoolClient, text: string, bandURL: string) =>
  con.query(
    `INSERT INTO
      corrections (text, band)
      VALUES      ($1,   $2)
    ON CONFLICT DO NOTHING;`,
    [text, bandURL]
  );

const submitRevision = (con: PoolClient, text: string, correctionID: number) =>
  con.query(
    `INSERT INTO
      revisions (text, correction)
      VALUES    ($1,   $2)
    ON CONFLICT DO NOTHING;`,
    [text, correctionID]
  );

const getCorrections = (con: PoolClient, bandURL: string) =>
  con
    .query('SELECT * FROM corrections WHERE band = $1;', [bandURL])
    .then(res => res.rows.map(parseCorrectionFromRow));


const getRevisions = (con: PoolClient, correctionID: number) =>
  con
    .query('SELECT * FROM revisions WHERE correction = $1;', [correctionID])
    .then(res => res.rows.map(parseRevisionFromRow));


export {
  createTables,
  submitCorrection,
  getCorrections,
  submitRevision,
  getRevisions,
};
