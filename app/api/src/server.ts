import { api } from "./app";
import Fastify, { RouteOptions } from "fastify";
import { prisma } from "@scruffy/database";
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

const port = parseInt(process.env.API_PORT || "", 10) || 8001;
const host = process.env.API_HOST || "0.0.0.0";

fastify.setErrorHandler((err, _req, reply) => {
  if (err instanceof QueryValidationError || err instanceof NotFoundError) {
    reply.status(err.code).send(err.body);
  } else {
    console.error("unknown error", err);
    reply.status(500).send({ error: "Internal server error" });
  }
});

const exit = async () => {
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", exit);
process.on("SIGINT", exit);

fastify.listen({ port, host }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
