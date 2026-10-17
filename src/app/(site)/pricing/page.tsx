import type { Metadata } from "next";
import { JsonLd } from "@/components/site/SiteChrome";
import { PricingPageView } from "@/components/site/PricingPageView";
import { SitePage } from "@/components/site/SitePage";
import { SECTIONS, SITE_NAME, pick } from "@/lib/site/content";
import { breadcrumbJsonLd } from "@/lib/site/jsonLd";
import { getPublicPlans } from "@/lib/site/plans";
import { languageAlternates } from "@/lib/site/urls";

export const metadata: Metadata = {
  title: pick(SECTIONS.pricingTitle, "en"),
  description: pick(SECTIONS.pricingBody, "en"),
  alternates: languageAlternates("/pricing"),
};

export default async function PricingPage() {
  const plans = await getPublicPlans();
  return (
    <SitePage lang="en" path="/pricing">
      <JsonLd
        data={breadcrumbJsonLd("en", [
          { name: SITE_NAME, path: "/" },
          { name: pick(SECTIONS.pricingTitle, "en"), path: "/pricing" },
        ])}
      />
      <PricingPageView lang="en" plans={plans} />
    </SitePage>
  );
}
