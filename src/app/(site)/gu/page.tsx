import type { Metadata } from "next";
import { JsonLd } from "@/components/site/SiteChrome";
import { SiteHome } from "@/components/site/SiteHome";
import { SitePage } from "@/components/site/SitePage";
import { HERO, pick } from "@/lib/site/content";
import { faqJsonLd, organizationJsonLd, softwareJsonLd, websiteJsonLd } from "@/lib/site/jsonLd";
import { getPublicPlans } from "@/lib/site/plans";
import { siteMetadata } from "@/lib/site/metadata";

/** Prerendered and served from the CDN; plans edited in HQ refresh it (revalidatePath) or within the hour. */
export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = siteMetadata({
  lang: "gu",
  title: pick(HERO.metaTitle, "gu"),
  description: pick(HERO.metaDescription, "gu"),
  absoluteTitle: true,
});

/** The same page in ગુજરાતી at its own address, so Google can index and show it. */
export default async function GujaratiHomePage() {
  const plans = await getPublicPlans();
  return (
    <SitePage lang="gu">
      <JsonLd data={[websiteJsonLd("gu"), organizationJsonLd("gu"), softwareJsonLd("gu"), faqJsonLd("gu")]} />
      <SiteHome lang="gu" plans={plans} />
    </SitePage>
  );
}
