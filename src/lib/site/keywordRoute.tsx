import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/SiteChrome";
import { KeywordPageView } from "@/components/site/KeywordPageView";
import { SitePage } from "@/components/site/SitePage";
import { SITE_NAME, keywordPage, pick } from "@/lib/site/content";
import { breadcrumbJsonLd, softwareJsonLd } from "@/lib/site/jsonLd";
import { languageAlternates } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

/** Builds the metadata and the page for one keyword page, in one language. */
export function keywordMetadata(slug: string, lang: Lang): Metadata {
  const page = keywordPage(slug);
  if (!page) return {};
  return {
    title: pick(page.title, lang),
    description: pick(page.description, lang),
    alternates: languageAlternates(`/${slug}`),
    openGraph: {
      title: pick(page.title, lang),
      description: pick(page.description, lang),
      type: "article",
      locale: lang === "gu" ? "gu_IN" : "en_IN",
    },
  };
}

export function KeywordRoute({ slug, lang }: { slug: string; lang: Lang }) {
  const page = keywordPage(slug);
  if (!page) notFound();

  return (
    <SitePage lang={lang} path={`/${slug}`}>
      <JsonLd
        data={[
          softwareJsonLd(lang),
          breadcrumbJsonLd(lang, [
            { name: SITE_NAME, path: "/" },
            { name: pick(page.heading, lang), path: `/${slug}` },
          ]),
        ]}
      />
      <KeywordPageView page={page} lang={lang} />
    </SitePage>
  );
}
