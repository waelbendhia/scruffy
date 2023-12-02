import { defineConfig } from "tsup";

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig([
  {
    clean: true,
    dts: true,
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    minify: isProduction,
    sourcemap: true,
  },
  {
    clean: true,
    dts: false,
    noExternal: [
      "rxjs",
      "form-data",
      "axios",
      "fastify",
      "fastify-sse-v2",
      "redis",
      "@sinclair/typebox",
      "@sinclair/typebox/value",
    ],
    target: "node18",
    entry: ["src/main.ts"],
    format: ["cjs"],
    minify: isProduction,
    skipNodeModulesBundle: false,
    sourcemap: true,
  },
  {
    clean: true,
    dts: false,
    noExternal: [/^@opentelemetry\/.*/, /^@prisma\/.*/],
    entry: ["src/instrumentation.ts"],
    format: ["cjs", "esm"],
    minify: isProduction,
    skipNodeModulesBundle: false,
  },
]);
