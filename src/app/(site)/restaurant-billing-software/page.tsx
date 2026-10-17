import type { Metadata } from "next";
import { KeywordRoute, keywordMetadata } from "@/lib/site/keywordRoute";

const SLUG = "restaurant-billing-software";

export const metadata: Metadata = keywordMetadata(SLUG, "en");

export default function RestaurantBillingSoftwarePage() {
  return <KeywordRoute slug={SLUG} lang="en" />;
}
