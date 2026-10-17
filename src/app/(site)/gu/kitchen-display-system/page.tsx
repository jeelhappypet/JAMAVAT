import type { Metadata } from "next";
import { KeywordRoute, keywordMetadata } from "@/lib/site/keywordRoute";

const SLUG = "kitchen-display-system";

export const metadata: Metadata = keywordMetadata(SLUG, "gu");

export default function KitchenDisplaySystemPageGu() {
  return <KeywordRoute slug={SLUG} lang="gu" />;
}
