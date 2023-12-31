import { defineConfig } from "tsup";

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig([
  {
    clean: true,
    dts: true,
    plugins: [],
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    minify: isProduction,
    sourcemap: true,
  },
  {
    clean: true,
    dts: false,
    plugins: [],
    noExternal: [/^@opentelemetry\/.*/, /^@prisma\/.*/, "zod", "fastify"],
    entry: ["src/server.ts"],
    format: ["cjs", "esm"],
    minify: isProduction,
    sourcemap: true,
    skipNodeModulesBundle: false,
  },
  {
    clean: true,
    dts: false,
    plugins: [],
    noExternal: [/^@opentelemetry\/.*/, /^@prisma\/.*/],
    entry: ["src/instrumentation.ts"],
    format: ["cjs", "esm"],
    minify: isProduction,
    sourcemap: true,
    skipNodeModulesBundle: false,
  },
]);
