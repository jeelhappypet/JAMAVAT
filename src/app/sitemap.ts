import type { MetadataRoute } from "next";
import { KEYWORD_PAGES } from "@/lib/site/content";
import { siteUrl } from "@/lib/site/urls";

/**
 * The day the site's copy last changed — bump it when you change a page.
 *
 * It used to be `new Date()`. A sitemap that claims every page changed on
 * the day it was built teaches Google that this site's `lastmod` means
 * nothing, and Google then schedules crawls without it — which is how
 * /pricing and /privacy sat in "Discovered - currently not indexed" for
 * weeks. A date that only moves when the page moves is worth more than a
 * fresh one.
 */
const LAST_MODIFIED = new Date("2026-10-27");

/** Every public page, in both languages, each pointing at the other. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/pricing", "/terms", "/privacy", ...KEYWORD_PAGES.map((page) => `/${page.slug}`)];

  return paths.map((path) => ({
    url: siteUrl("en", path),
    lastModified: LAST_MODIFIED,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/privacy" || path === "/terms" ? 0.3 : 0.8,
    // The privacy policy has no /gu page of its own — an alternate pointing at a 404 makes Google distrust the rest.
    ...(path === "/privacy" ? {} : { alternates: { languages: { "en-IN": siteUrl("en", path), "gu-IN": siteUrl("gu", path) } } }),
  }));
}
