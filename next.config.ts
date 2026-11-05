import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les tests e2e lancent leur propre serveur de dev (NEXT_DIST_DIR=.next-e2e)
  // pour ne pas entrer en conflit avec un `pnpm dev` déjà ouvert.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
