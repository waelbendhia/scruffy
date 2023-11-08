import { Request, Response, NextFunction } from "express";
import http from "http";
import { v4 } from "uuid";

type AsyncHandlerFunc<T> = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<T>;

export const uuidMiddleware = (
  _: Request,
  res: Response,
  next: NextFunction,
) => {
  const uuid = v4();
  res.locals.requestID = uuid;
  res.setHeader("X-Request-ID", uuid);
  next();
};

export const getUUID = (res: Response): string | null => {
  const uuid = res.locals.requestID;
  return typeof uuid === "string" ? res.locals.requestID : null;
};

export const makeHTTPConMiddleware =
  (timeout: number, pool: http.Agent) =>
  async (_: Request, res: Response, next: NextFunction) => {
    res.locals.timeout = timeout;
    res.locals.pool = pool;
    next();
  };

export const getHTTPConFromRes = (res: Response) => ({
  timeout: res.locals.con.timeout as number,
  pool: res.locals.pool as http.Agent,
});

export const wrapAsync =
  <T>(fn: AsyncHandlerFunc<T>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

export const errorMiddleware = (err: Error, _: Request, res: Response) => {
  res.status(500).json(`Something's gone wrong, sorry...`);
  console.error(
    `Request '${getUUID(res)}' failed with ${err.name}:\n${err.stack}`,
  );
};
