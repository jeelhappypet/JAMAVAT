import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site/urls";

/**
 * Only Jamavat's own pages are for search engines. A restaurant's app, its
 * guests' QR pages and HQ are private — they're also `noindex`, but saying
 * so here keeps crawlers from asking for them at all.
 *
 * The three auth pages are deliberately *not* listed. They carry
 * `robots: { index: false, follow: false }` already, and the public header
 * links to /login — so a crawler finds it either way. Disallowing it only
 * stopped Google reading the noindex it was meant to obey, and Search
 * Console reported the page as "Blocked by robots.txt" instead of quietly
 * dropping it. Crawl-block and noindex on the same URL cancel each other:
 * pick one, and for a linked page it has to be noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/r/", "/t/", "/hq", "/go", "/api/"] }],
    sitemap: `${siteOrigin()}/sitemap.xml`,
    // No `host:` line — it's a Yandex-only directive that Google ignores and validators report as invalid syntax.
  };
}
