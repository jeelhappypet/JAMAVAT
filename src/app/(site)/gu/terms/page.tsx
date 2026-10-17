import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";
import { TermsView } from "@/components/site/TermsView";
import { pick } from "@/lib/site/content";
import { TERMS_INTRO, TERMS_TITLE } from "@/lib/site/terms";
import { languageAlternates } from "@/lib/site/urls";

export const metadata: Metadata = {
  title: pick(TERMS_TITLE, "gu"),
  description: pick(TERMS_INTRO, "gu").slice(0, 160),
  alternates: languageAlternates("/terms"),
};

export default function TermsPageGu() {
  return (
    <SitePage lang="gu" path="/terms">
      <TermsView lang="gu" />
    </SitePage>
  );
}
