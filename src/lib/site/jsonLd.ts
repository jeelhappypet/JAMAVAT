import { CONTACT, HERO, SITE_NAME, brandProfiles, internationalPhone, pick } from "@/lib/site/content";
import { siteOrigin, siteUrl } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

/**
 * What Google reads about Jamavat. Only facts that are true on the page:
 * no invented ratings or review counts — those earn a manual penalty and
 * they'd be a lie besides. No FAQPage either: since 2023 Google shows FAQ
 * results only for government and health sites, and the markup would carry
 * every answer a second time (twice, with the RSC payload) for nothing.
 */

/**
 * The site's name as Google should show it above the result — with the
 * ગુજરાતી spelling as an alternate, so a search for either finds us.
 */
export function websiteJsonLd(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    // The Instagram handle is in here because people who saw the account search
    // for it by name; without it that search finds Instagram and not this site.
    alternateName: ["જમાવટ", "Jamavat restaurant software", CONTACT.instagram],
    url: `${siteOrigin()}/`,
    inLanguage: lang === "gu" ? "gu-IN" : "en-IN",
  };
}

export function organizationJsonLd(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: "જમાવટ",
    url: `${siteOrigin()}/`,
    logo: `${siteOrigin()}/icons/icon-512.png`,
    description: pick(HERO.metaDescription, lang),
    // Instagram is always in here (see CONTACT.instagram) — it is how Google
    // ties @jamavat.india and this site to one brand.
    sameAs: brandProfiles(),
    ...(CONTACT.email ? { email: CONTACT.email } : {}),
    ...(CONTACT.phone
      ? {
          contactPoint: [
            { "@type": "ContactPoint", telephone: internationalPhone(CONTACT.phone), contactType: "sales", areaServed: "IN", availableLanguage: ["en", "gu"] },
          ],
        }
      : {}),
  };
}

export function softwareJsonLd(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web browser",
    url: siteUrl(lang),
    description: pick(HERO.metaDescription, lang),
    image: `${siteOrigin()}/site/og.png`,
    inLanguage: ["en-IN", "gu-IN"],
    audience: { "@type": "Audience", audienceType: "Restaurants" },
  };
}

export function breadcrumbJsonLd(lang: Lang, trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: siteUrl(lang, step.path),
    })),
  };
}
