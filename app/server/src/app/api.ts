import express from "express";
import * as artist from "./artist";
import * as album from "./album";
import { makeHTTPConMiddleware } from "./shared";
import http from "http";

const api = express
  .Router()
  .use("/artist", artist.router())
  .use("/album", album.router());

const router = express
  .Router()
  .use(
    makeHTTPConMiddleware(
      500,
      new http.Agent({
        maxSockets: 10,
        keepAlive: true,
      }),
    ),
  )
  .use("/api/", api);

export { router };
