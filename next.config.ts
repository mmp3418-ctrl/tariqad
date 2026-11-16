import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Admin dashboard is cookie/session driven — keep routes dynamic.
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
