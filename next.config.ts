import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v1 screens moved; keep old bookmarks and installed shortcuts working.
  async redirects() {
    return [
      { source: "/pending-order", destination: "/kitchen", permanent: false },
      { source: "/live-order", destination: "/counter", permanent: false },
    ];
  },
};

export default nextConfig;
