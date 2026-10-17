import type { MetadataRoute } from "next";
import { KEYWORD_PAGES } from "@/lib/site/content";
import { siteUrl } from "@/lib/site/urls";

/** Every public page, in both languages, each pointing at the other. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/pricing", "/terms", "/privacy", ...KEYWORD_PAGES.map((page) => `/${page.slug}`)];
  const now = new Date();

  return paths.map((path) => ({
    url: siteUrl("en", path),
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/privacy" || path === "/terms" ? 0.3 : 0.8,
    alternates: { languages: { "en-IN": siteUrl("en", path), "gu-IN": siteUrl("gu", path) } },
  }));
}
