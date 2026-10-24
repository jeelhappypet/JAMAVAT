import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site/content";
import { languageAlternates, siteOrigin, siteUrl } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

/** The card WhatsApp, Facebook and LinkedIn show for a shared link (scripts/capture-og.mjs). */
const OG_IMAGE = { url: `${siteOrigin()}/site/og.png`, width: 1200, height: 630, alt: "Jamavat — QR table ordering & kitchen software for restaurants" };

/**
 * Metadata for one public page in one language: its own canonical, hreflang
 * to the other language, the Open Graph / Twitter card, and the crawl limits
 * below. `title` goes through the root layout's "%s · Jamavat" template
 * unless `absoluteTitle` (the home page leads with the brand instead).
 */
export function siteMetadata({
  lang,
  path = "/",
  title,
  description,
  absoluteTitle = false,
  type = "website",
  hasGujarati = true,
}: {
  lang: Lang;
  path?: string;
  title: string;
  description: string;
  absoluteTitle?: boolean;
  type?: "website" | "article";
  hasGujarati?: boolean;
}): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  const alternates = languageAlternates(path, lang);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: hasGujarati ? alternates : { canonical: alternates.canonical },
    /**
     * Indexing is the default, so this line is really about the three limits
     * after it: without `max-image-preview: large` Google will not put a
     * picture next to the result, and a search result with a screenshot of
     * the product beside it is a different thing to look at than four lines
     * of text. `-1` lifts the snippet and video caps for the same reason.
     * (The app and the guest pages set `noindex` of their own.)
     */
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: siteUrl(lang, path),
      siteName: SITE_NAME,
      type,
      locale: lang === "gu" ? "gu_IN" : "en_IN",
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [OG_IMAGE.url] },
  };
}
