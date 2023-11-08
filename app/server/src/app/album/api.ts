import { search, getCount, SearchRequest } from "./database";
import { RouteHandlerMethod } from "fastify";
import { QueryValidationError } from "../errors";
import { Router } from "../routing";

export const api = {
  domain: "album",
  routes: {
    "/": (async (req, _) => {
      const eitherRequest = SearchRequest.safeParse(req.query);
      if (!eitherRequest.success) {
        throw new QueryValidationError(eitherRequest.error);
      }

      return await search(eitherRequest.data);
    }) satisfies RouteHandlerMethod,
    "/total": ((_, _reply) => getCount()) satisfies RouteHandlerMethod,
  },
} satisfies Router<"album">;
