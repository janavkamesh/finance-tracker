import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      // Cache RSC payloads for dynamic routes on the client for 30s.
      // Navigation to a recently-visited page is served from client cache — no server roundtrip.
      dynamic: 30,
      static: 300,
    },
    // Required by cachedNavigations
    cacheComponents: true,
    // Keep prefetched RSC payloads in memory while navigating
    cachedNavigations: true,
    // Inline prefetched data so first-click navigation is also instant
    prefetchInlining: true,
  },
};

export default nextConfig;
