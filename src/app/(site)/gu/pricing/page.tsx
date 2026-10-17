import type { Metadata } from "next";
import { JsonLd } from "@/components/site/SiteChrome";
import { PricingPageView } from "@/components/site/PricingPageView";
import { SitePage } from "@/components/site/SitePage";
import { SECTIONS, SITE_NAME, pick } from "@/lib/site/content";
import { breadcrumbJsonLd } from "@/lib/site/jsonLd";
import { getPublicPlans } from "@/lib/site/plans";
import { languageAlternates } from "@/lib/site/urls";

export const metadata: Metadata = {
  title: pick(SECTIONS.pricingTitle, "gu"),
  description: pick(SECTIONS.pricingBody, "gu"),
  alternates: languageAlternates("/pricing"),
};

export default async function PricingPageGu() {
  const plans = await getPublicPlans();
  return (
    <SitePage lang="gu" path="/pricing">
      <JsonLd
        data={breadcrumbJsonLd("gu", [
          { name: SITE_NAME, path: "/" },
          { name: pick(SECTIONS.pricingTitle, "gu"), path: "/pricing" },
        ])}
      />
      <PricingPageView lang="gu" plans={plans} />
    </SitePage>
  );
}
