import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";
import { TermsView } from "@/components/site/TermsView";
import { pick } from "@/lib/site/content";
import { TERMS_INTRO, TERMS_TITLE } from "@/lib/site/terms";
import { siteMetadata } from "@/lib/site/metadata";

/** Prerendered and served from the CDN — nothing on it changes between deploys. */
export const dynamic = "force-static";

export const metadata: Metadata = siteMetadata({
  lang: "en",
  path: "/terms",
  title: pick(TERMS_TITLE, "en"),
  description: pick(TERMS_INTRO, "en").slice(0, 155),
  type: "article",
});

export default function TermsPage() {
  return (
    <SitePage lang="en" path="/terms">
      <TermsView lang="en" />
    </SitePage>
  );
}
