import { CONTACT, FAQS, HERO, SITE_NAME, pick } from "@/lib/site/content";
import { siteUrl } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

/**
 * What Google reads about Jamavat. Only facts that are true on the page:
 * no invented ratings or review counts — those earn a manual penalty and
 * they'd be a lie besides.
 */
export function organizationJsonLd(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl(lang),
    description: pick(HERO.body, lang),
    ...(CONTACT.email ? { email: CONTACT.email } : {}),
    ...(CONTACT.phone
      ? { contactPoint: [{ "@type": "ContactPoint", telephone: CONTACT.phone, contactType: "sales", areaServed: "IN", availableLanguage: ["en", "gu"] }] }
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
    description: pick(HERO.body, lang),
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
