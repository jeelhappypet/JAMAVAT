import type { Metadata } from "next";
import { KeywordRoute, keywordMetadata } from "@/lib/site/keywordRoute";

const SLUG = "restaurant-billing-software";

/** Prerendered and served from the CDN — nothing on it changes between deploys. */
export const dynamic = "force-static";

export const metadata: Metadata = keywordMetadata(SLUG, "en");

export default function RestaurantBillingSoftwarePage() {
  return <KeywordRoute slug={SLUG} lang="en" />;
}
