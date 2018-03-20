export {
  updateDatabase,
  resetDatabase,
};
import { PoolClient } from 'pg';
import * as Album from './album';
import * as Band from './band';
import http from 'http';

const dropTables =
  (con: PoolClient) =>
    con.query(`DROP TABLE IF EXISTS bands2bands, albums, bands;`);


const createTables = (con: PoolClient) =>
  Promise.all([Band.createTables(con), Album.createTable(con)]);

const updateDatabase =
  async (con: PoolClient, timeout: number, pool: http.Agent) => {
    const bands = await Band.getAllBands(timeout, pool);
    await Promise.all(
      bands.map(
        async (b) => {
          try {
            const band = await Band.getInfo(b, timeout, pool);
            console.log(band.name + ' ' + band.url);
            if (!band.bio) {
              console.log(`${band.url} has no bio.`);
            }
            if (!band.name) {
              console.log(`${band.url} has no name.`);
            } else {
              await Band.insertOrUpdateFull(con, band);
            }
          } catch (e) {
            console.log(b.name, e.message);
          }
        }
      )
    );

    await Promise.all([
      await Band.updateEmptyPhotos(con, timeout, pool),
      await Album.updateEmptyPhotos(con, timeout, pool),
    ]);
  };

const resetDatabase =
  async (con: PoolClient, timeout: number, pool: http.Agent) => {
    console.log('Dropping tables');
    await dropTables(con);
    console.log('Creating tables');
    await createTables(con);
    console.log('Updating tables');
    await updateDatabase(con, timeout, pool);
  };
