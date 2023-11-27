import withPlaiceholder from "@plaiceholder/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: false,
  env: {
    GITHUB_SHA: process.env.GITHUB_SHA,
  },
  experimental: { instrumentationHook: true },
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
