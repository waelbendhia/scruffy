import { PoolClient } from 'pg';
import { Request, Response, NextFunction } from 'express';
import http from 'http';

const makeDBConMiddleware =
  (getDBCon: () => Promise<PoolClient>) =>
    async (_: Request, res: Response, next: NextFunction) => {
      const con = await getDBCon();
      res.locals.con = con;
      next();
      con.release();
    };

const getDBFromRes = (res: Response) => res.locals.con as PoolClient;

const makeHTTPConMiddleware =
  (timeout: number, pool: http.Agent) =>
    async (_: Request, res: Response, next: NextFunction) => {
      res.locals.timeout = timeout;
      res.locals.pool = pool;
      next();
    };

const getHTTPConFromRes = (res: Response) => ({
  timeout: res.locals.con.timeout as number,
  pool: res.locals.pool as http.Agent,
});

export {
  getDBFromRes,
  makeDBConMiddleware,
  getHTTPConFromRes,
  makeHTTPConMiddleware,
};
