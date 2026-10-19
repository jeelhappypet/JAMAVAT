import type { Metadata } from "next";
import { JsonLd } from "@/components/site/SiteChrome";
import { SiteHome } from "@/components/site/SiteHome";
import { SitePage } from "@/components/site/SitePage";
import { HERO, pick } from "@/lib/site/content";
import { organizationJsonLd, softwareJsonLd, websiteJsonLd } from "@/lib/site/jsonLd";
import { getPublicPlans } from "@/lib/site/plans";
import { siteMetadata } from "@/lib/site/metadata";

/** Prerendered and served from the CDN; plans edited in HQ refresh it (revalidatePath) or within the hour. */
export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = siteMetadata({
  lang: "en",
  title: pick(HERO.metaTitle, "en"),
  description: pick(HERO.metaDescription, "en"),
  absoluteTitle: true,
});

export default async function HomePage() {
  const plans = await getPublicPlans();
  return (
    <SitePage lang="en">
      <JsonLd data={[websiteJsonLd("en"), organizationJsonLd("en"), softwareJsonLd("en")]} />
      <SiteHome lang="en" plans={plans} />
    </SitePage>
  );
}
