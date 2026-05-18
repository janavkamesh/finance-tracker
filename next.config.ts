import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      // Client-side RSC cache: revisiting a page within 30s is instant (no server roundtrip).
      // Busted automatically by revalidatePath() inside server actions on mutation.
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
