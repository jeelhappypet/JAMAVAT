import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site/content";
import { languageAlternates, siteOrigin, siteUrl } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

/** The card WhatsApp, Facebook and LinkedIn show for a shared link (scripts/capture-og.mjs). */
const OG_IMAGE = { url: `${siteOrigin()}/site/og.png`, width: 1200, height: 630, alt: "Jamavat — QR table ordering & kitchen software for restaurants" };

/**
 * Metadata for one public page in one language: its own canonical, hreflang
 * to the other language, and the Open Graph / Twitter card. `title` goes
 * through the root layout's "%s · Jamavat" template unless `absoluteTitle`
 * (the home page leads with the brand instead).
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
