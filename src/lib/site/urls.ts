import type { Lang } from "@/lib/i18n/messages";

/** The site's own origin, used for canonical links, hreflang, OG tags and the sitemap. */
export function siteOrigin(): string {
  return (process.env.APP_URL || "https://jamavat.vercel.app").replace(/\/$/, "");
}

/**
 * Both languages are real pages with their own addresses — English at `/…`
 * and ગુજરાતી under `/gu/…` — so Google can index and show each of them.
 * A cookie-switched single URL can't be.
 */
export function sitePath(lang: Lang, path = "/"): string {
  const clean = path === "/" ? "" : path;
  return lang === "gu" ? `/gu${clean}` : clean || "/";
}

export function siteUrl(lang: Lang, path = "/"): string {
  return `${siteOrigin()}${sitePath(lang, path)}`;
}

/**
 * The canonical + hreflang block every public page carries. The canonical is
 * the page's own address — a ગુજરાતી page pointing at the English one tells
 * Google it's a duplicate, and Google then drops it from the index.
 */
export function languageAlternates(path = "/", lang: Lang = "en") {
  return {
    canonical: siteUrl(lang, path),
    languages: {
      "en-IN": siteUrl("en", path),
      "gu-IN": siteUrl("gu", path),
      "x-default": siteUrl("en", path),
    },
  };
}
