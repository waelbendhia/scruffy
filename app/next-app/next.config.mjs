// @ts-check
import withPlaiceholder from "@plaiceholder/next";
import path from "path";
import { fileURLToPath } from "url";

const GITHUB_SHA = process.env.GITHUB_SHA;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: false,
  env: GITHUB_SHA ? { GITHUB_SHA } : undefined,
  experimental: {
    instrumentationHook: true,
    incrementalCacheHandlerPath: path.join(__dirname, "./cache-handler.js"),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
        port: "",
        pathname: "/image/**",
      },
      {
        protocol: "https",
        hostname: "e-cdns-images.dzcdn.net",
        port: "",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "lastfm.freetls.fastly.net",
        port: "",
        pathname: "/i/**",
      },
      {
        protocol: "https",
        hostname: "archive.org",
        port: "",
        pathname: "/download/**",
      },
    ],
  },
};

export default withPlaiceholder(nextConfig);
