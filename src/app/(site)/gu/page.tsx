import type { Metadata } from "next";
import { JsonLd } from "@/components/site/SiteChrome";
import { SiteHome } from "@/components/site/SiteHome";
import { SitePage } from "@/components/site/SitePage";
import { HERO, pick } from "@/lib/site/content";
import { faqJsonLd, organizationJsonLd, softwareJsonLd } from "@/lib/site/jsonLd";
import { getPublicPlans } from "@/lib/site/plans";
import { languageAlternates } from "@/lib/site/urls";

export const metadata: Metadata = {
  title: pick(HERO.title, "gu"),
  description: pick(HERO.body, "gu"),
  alternates: languageAlternates("/"),
  openGraph: { title: `જમાવટ — ${pick(HERO.title, "gu")}`, description: pick(HERO.body, "gu"), type: "website", locale: "gu_IN" },
};

/** The same page in ગુજરાતી at its own address, so Google can index and show it. */
export default async function GujaratiHomePage() {
  const plans = await getPublicPlans();
  return (
    <SitePage lang="gu">
      <JsonLd data={[organizationJsonLd("gu"), softwareJsonLd("gu"), faqJsonLd("gu")]} />
      <SiteHome lang="gu" plans={plans} />
    </SitePage>
  );
}
