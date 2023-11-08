import express from "express";
import { wrapAsync } from "../shared";
import { getCount, get, search } from "./database";
import { parseBandSearchRequest } from "./types";

const router = () =>
  express
    .Router()
    .get(
      "/",
      wrapAsync(async (req, res) => {
        res.status(200).json(await search(parseBandSearchRequest(req.query)));
      }),
    )
    .get(
      "/total",
      wrapAsync(async (_, res) => res.status(200).json(await getCount())),
    )
    .get(
      "/:volume/:url",
      wrapAsync(async (req, res) => {
        const band = await get(`${req.params.volume}/${req.params.url}.html`);

        if (!band) {
          res.status(404).json("Whoopsie");
          return;
        }

        res.status(200).json({ ...band });
      }),
    );

export { router };
