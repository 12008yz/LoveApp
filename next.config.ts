import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep recently visited app tabs warm so bottom-nav switches feel instant
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  // Keep SQLite + static Prisma engine next to the standalone server on Layero
  outputFileTracingIncludes: {
    "/**": [
      "./prisma/**/*",
      "./node_modules/.prisma/client/query-engine-linux-static-x64",
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/prisma/*.db",
          "**/prisma/*.db-*",
          "**/public/uploads/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
