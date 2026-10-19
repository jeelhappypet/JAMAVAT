import type { Metadata } from "next";
import { JsonLd } from "@/components/site/SiteChrome";
import { PricingPageView } from "@/components/site/PricingPageView";
import { SitePage } from "@/components/site/SitePage";
import { SECTIONS, SITE_NAME, pick } from "@/lib/site/content";
import { breadcrumbJsonLd } from "@/lib/site/jsonLd";
import { getPublicPlans } from "@/lib/site/plans";
import { siteMetadata } from "@/lib/site/metadata";

/** Prerendered and served from the CDN; plans edited in HQ refresh it (revalidatePath) or within the hour. */
export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = siteMetadata({
  lang: "gu",
  path: "/pricing",
  title: pick(SECTIONS.pricingTitle, "gu"),
  description: pick(SECTIONS.pricingBody, "gu"),
});

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
