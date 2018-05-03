import { PoolClient } from 'pg';
import { Request, Response, NextFunction } from 'express';
import http from 'http';
import { v4 } from 'uuid';

const uuidMiddleware = (_: Request, res: Response, next: NextFunction) => {
  const uuid = v4();
  res.locals.requestID = uuid;
  res.setHeader('X-Request-ID', uuid);
  next();
};

const getUUID = (res: Response): string | null => {
  const uuid = res.locals.requestID;
  return typeof uuid === 'string'
    ? res.locals.requestID
    : null;
};

const makeDBConMiddleware = (getDBCon: () => Promise<PoolClient>) =>
  async (_: Request, res: Response, next: NextFunction) => {
    const con = await getDBCon();

    res.locals.con = con;

    next();
    con.release();
  };

const getDBFromRes = (res: Response) => res.locals.con as PoolClient;

const makeHTTPConMiddleware = (timeout: number, pool: http.Agent) =>
  async (_: Request, res: Response, next: NextFunction) => {
    res.locals.timeout = timeout;
    res.locals.pool = pool;
    next();
  };

const getHTTPConFromRes = (res: Response) => ({
  timeout: res.locals.con.timeout as number,
  pool: res.locals.pool as http.Agent,
});

const wrapAsync = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

const errorMiddleware =
  (err: Error, _: Request, res: Response) => {
    res.status(500).json(`Something's gone wrong, sorry...`);
    console.error(
      `Request '${getUUID(res)}' failed with ${err.name}:\n${err.stack}`
    );
  };

export {
  getDBFromRes,
  makeDBConMiddleware,
  getHTTPConFromRes,
  makeHTTPConMiddleware,
  uuidMiddleware,
  getUUID,
  wrapAsync,
  errorMiddleware,
};
