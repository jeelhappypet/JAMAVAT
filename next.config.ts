import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tells scanners which framework to try exploits against, and nothing useful to anyone else.
  poweredByHeader: false,
  // Poll instead of inotify when the OS watcher limit is exhausted (EMFILE).
  ...(process.env.WATCHPACK_POLLING === "true" && {
    watchOptions: { pollIntervalMs: 1000 },
  }),
  async headers() {
    return [
      {
        // Search Console lists every URL it crawls, and build assets are URLs:
        // a preloaded .woff2 turned up under "Crawled - currently not indexed",
        // which is correct behaviour but buries the page problems that matter.
        // `noindex` as a header (the only way to mark a non-HTML file) keeps
        // them out of the report without blocking the crawl, so rendering is
        // unaffected.
        source: "/_next/static/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      {
        // Google reads a site's favicon when it crawls the home page and caches
        // what it gets. Vercel serves `public/` as `max-age=0, must-revalidate`,
        // so every check was a fresh fetch. A day of cache is what the icon
        // actually changes at. No `X-Robots-Tag` here — a noindex on the icon
        // is read as "don't show this", which is the opposite of the point.
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
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
