import type { Metadata } from "next";
import { JsonLd } from "@/components/site/SiteChrome";
import { SiteHome } from "@/components/site/SiteHome";
import { SitePage } from "@/components/site/SitePage";
import { HERO, pick } from "@/lib/site/content";
import { faqJsonLd, organizationJsonLd, softwareJsonLd } from "@/lib/site/jsonLd";
import { getPublicPlans } from "@/lib/site/plans";
import { languageAlternates } from "@/lib/site/urls";

export const metadata: Metadata = {
  title: pick(HERO.title, "en"),
  description: pick(HERO.body, "en"),
  alternates: languageAlternates("/"),
  openGraph: { title: `Jamavat — ${pick(HERO.title, "en")}`, description: pick(HERO.body, "en"), type: "website", locale: "en_IN" },
};

export default async function HomePage() {
  const plans = await getPublicPlans();
  return (
    <SitePage lang="en">
      <JsonLd data={[organizationJsonLd("en"), softwareJsonLd("en"), faqJsonLd("en")]} />
      <SiteHome lang="en" plans={plans} />
    </SitePage>
  );
}
