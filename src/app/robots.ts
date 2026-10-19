import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site/urls";

/**
 * Only Jamavat's own pages are for search engines. A restaurant's app, its
 * guests' QR pages and HQ are private — they're also `noindex`, but saying
 * so here keeps crawlers from asking for them at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/r/", "/t/", "/hq", "/go", "/api/", "/login", "/forgot-password", "/reset-password"] }],
    sitemap: `${siteOrigin()}/sitemap.xml`,
    // No `host:` line — it's a Yandex-only directive that Google ignores and validators report as invalid syntax.
  };
}
