import type { NextConfig } from "next";

/**
 * Vercel + App Router: do NOT use `output: "export"` — static export
 * breaks deep-link refresh for /admin/* unless every host rewrites to index.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  poweredByHeader: false,
  async redirects() {
    return [
      // Legacy / mistaken paths → live App Router routes
      { source: "/admin/", destination: "/admin", permanent: false },
      { source: "/settings", destination: "/admin/settings", permanent: false },
      { source: "/settings/", destination: "/admin/settings", permanent: false },
      { source: "/dashboard", destination: "/admin", permanent: false },
      { source: "/dashboard/:path*", destination: "/admin/:path*", permanent: false },
      { source: "/login/", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
