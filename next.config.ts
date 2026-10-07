import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The v1 kitchen queue moved to /kitchen; keep old bookmarks and installed shortcuts working.
  async redirects() {
    return [{ source: "/pending-order", destination: "/kitchen", permanent: false }];
  },
};

export default nextConfig;
