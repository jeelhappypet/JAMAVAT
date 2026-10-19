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
  lang: "en",
  path: "/pricing",
  title: pick(SECTIONS.pricingTitle, "en"),
  description: pick(SECTIONS.pricingBody, "en"),
});

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
