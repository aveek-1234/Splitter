import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  async headers() {
    return [
      // ✅ 1. Static assets (safe to cache long)
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },

      // ✅ 2. Public pages (SSG / ISR only)
      {
        source: "/((?!api|dashboard|profile).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=60",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
