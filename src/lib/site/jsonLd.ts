import { CONTACT, FAQS, HERO, SITE_NAME, internationalPhone, pick } from "@/lib/site/content";
import { siteOrigin, siteUrl } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

/**
 * What Google reads about Jamavat. Only facts that are true on the page:
 * no invented ratings or review counts — those earn a manual penalty and
 * they'd be a lie besides.
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
    alternateName: ["જમાવટ", "Jamavat restaurant software"],
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

export function faqJsonLd(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: pick(faq.q, lang),
      acceptedAnswer: { "@type": "Answer", text: pick(faq.a, lang) },
    })),
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
