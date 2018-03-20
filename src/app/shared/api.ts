export {
  makeDBConMiddleware
};
import { PoolClient } from 'pg';
import { Request, Response, NextFunction } from 'express';

const makeDBConMiddleware =
  (getDBCon: () => Promise<PoolClient>) =>
    async (_: Request, res: Response, next: NextFunction) => {
      const con = await getDBCon();
      res.locals.con = con;
      next();
      con.release();
    };
