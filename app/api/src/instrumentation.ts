import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";

const sdk = new NodeSDK({
  serviceName: "scruffy-api",
  instrumentations: [
    getNodeAutoInstrumentations(),
    new PrismaInstrumentation(),
  ],
});

sdk.start();

const exit = async () => {
  await sdk.shutdown();
  process.exit(0);
};

process.on("SIGTERM", exit);
process.on("SIGINT", exit);
