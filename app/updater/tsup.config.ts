import { defineConfig } from "tsup";

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig([
  {
    clean: true,
    dts: true,
    plugins: [],
    entry: ["typescript/index.ts"],
    format: ["cjs"],
    minify: isProduction,
    sourcemap: true,
  },
]);
