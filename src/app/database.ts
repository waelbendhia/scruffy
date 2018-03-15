export {
  updateDatabase,
  resetDatabase,
};
import pg, { PoolClient, Query } from 'pg';
import * as Album from './album';
import * as Band from './band';

const dropTables =
  (con: PoolClient) =>
    con.query(`dropQuery = 'DROP TABLE IF EXISTS bands2bands, albums, bands;'`);


const createTables = (con: PoolClient) =>
  Promise.all([Band.createTables(con), Album.createTable(con)]);

const updateDatabase = async (con: PoolClient) => {
  const bands = await Band.getAllBands(),
    fullBands = await Promise.all(bands.map(Band.getInfo));

  await Promise.all([
    ...fullBands.map(b => Band.insertOrUpdateFull(con, b)),
    await Band.updateEmptyPhotos(con),
    await Album.updateEmptyPhotos(con),
  ]);
};

const resetDatabase = async (con: PoolClient) => {
  console.log('Dropping tables');
  await dropTables(con);
  console.log('Creatig tables');
  await createTables(con);
  console.log('Updating tables');
  await updateDatabase(con);
};
