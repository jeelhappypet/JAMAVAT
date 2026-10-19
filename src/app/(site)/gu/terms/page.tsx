import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";
import { TermsView } from "@/components/site/TermsView";
import { pick } from "@/lib/site/content";
import { TERMS_INTRO, TERMS_TITLE } from "@/lib/site/terms";
import { siteMetadata } from "@/lib/site/metadata";

/** Prerendered and served from the CDN — nothing on it changes between deploys. */
export const dynamic = "force-static";

export const metadata: Metadata = siteMetadata({
  lang: "gu",
  path: "/terms",
  title: pick(TERMS_TITLE, "gu"),
  description: pick(TERMS_INTRO, "gu").slice(0, 155),
  type: "article",
});

export default function TermsPageGu() {
  return (
    <SitePage lang="gu" path="/terms">
      <TermsView lang="gu" />
    </SitePage>
  );
}
