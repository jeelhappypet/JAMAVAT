import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tells scanners which framework to try exploits against, and nothing useful to anyone else.
  poweredByHeader: false,
  // Poll instead of inotify when the OS watcher limit is exhausted (EMFILE).
  ...(process.env.WATCHPACK_POLLING === "true" && {
    watchOptions: { pollIntervalMs: 1000 },
  }),
  // v1 screens moved; keep old bookmarks and installed shortcuts working.
  async redirects() {
    return [
      { source: "/pending-order", destination: "/kitchen", permanent: false },
      { source: "/live-order", destination: "/counter", permanent: false },
      { source: "/developer", destination: "/reports", permanent: false },
    ];
  },
};

export default nextConfig;
