import type { Metadata } from "next";
import { KeywordRoute, keywordMetadata } from "@/lib/site/keywordRoute";

const SLUG = "kitchen-display-system";

export const metadata: Metadata = keywordMetadata(SLUG, "en");

export default function KitchenDisplaySystemPage() {
  return <KeywordRoute slug={SLUG} lang="en" />;
}
