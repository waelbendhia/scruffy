import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";

const sdk = new NodeSDK({
  serviceName: "scruffy-api",
  instrumentations: [
    getNodeAutoInstrumentations(),
    new PrismaInstrumentation(),
    new HttpInstrumentation(),
    new FastifyInstrumentation(),
  ],
});

sdk.start();

const exit = async () => {
  await sdk.shutdown();
  process.exit(0);
};

process.on("SIGTERM", exit);
process.on("SIGINT", exit);
