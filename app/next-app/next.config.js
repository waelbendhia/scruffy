/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    GITHUB_SHA: process.env.GITHUB_SHA,
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
        pathname: "/images/cover/**",
      },
    ],
  },
};

module.exports = nextConfig;
