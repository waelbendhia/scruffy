import { api } from "./app";
import Fastify, { RouteOptions } from "fastify";
import { NotFoundError, QueryValidationError } from "./app/errors";

const fastify = Fastify({ logger: true });

Object.entries(api.routes).forEach(([prefix, router]) => {
  const routes: RouteOptions<any, any, any, any>[] =
    router.domain === "album"
      ? Object.entries(router.routes).map(([url, handler]) => ({
          method: "GET",
          url,
          handler,
        }))
      : Object.entries(router.routes).map(([url, handler]) => ({
          method: "GET",
          url,
          handler,
        }));
  fastify.register(
    (app, _, done) => {
      routes.forEach((route) => app.route(route));
      done();
    },
    { prefix },
  );
});

const port = parseInt(process.env.SERVER_PORT || "", 10) || 8001;
const host = process.env.SERVER_HOST || "0.0.0.0";

fastify.setErrorHandler((err, _req, reply) => {
  if (err instanceof QueryValidationError || err instanceof NotFoundError) {
    reply.status(err.code).send(err.body);
  } else {
    console.error("unknown error", err);
    reply.status(500).send({ error: "Internal server error" });
  }
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

fastify.listen({ port, host }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
