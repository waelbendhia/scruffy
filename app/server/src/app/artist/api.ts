import { getCount, get, search, SearchRequest } from "./database";
import { NotFoundError, QueryValidationError } from "../errors";
import {
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteHandlerMethod,
} from "fastify";
import { Router } from "../routing";

export const api = {
  domain: "artist",
  routes: {
    "/": (async (req, _reply) => {
      const eitherRequest = SearchRequest.safeParse(req.query);
      if (!eitherRequest.success) {
        throw new QueryValidationError(eitherRequest.error);
      }

      return await search(eitherRequest.data);
    }) satisfies RouteHandlerMethod,
    "/total": ((_, __reply) => getCount()) satisfies RouteHandlerMethod,
    "/:volume/:url": (async (req, _reply) => {
      const band = await get(`${req.params.volume}/${req.params.url}.html`);

      if (!band) {
        throw new NotFoundError("artist");
      }

      return band;
    }) satisfies RouteHandlerMethod<
      RawServerDefault,
      RawRequestDefaultExpression<RawServerDefault>,
      RawReplyDefaultExpression<RawServerDefault>,
      { Params: { volume: string; url: string } }
    >,
  },
} satisfies Router<"artist">;
