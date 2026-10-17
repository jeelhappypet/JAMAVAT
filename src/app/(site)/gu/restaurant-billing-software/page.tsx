import type { Metadata } from "next";
import { KeywordRoute, keywordMetadata } from "@/lib/site/keywordRoute";

const SLUG = "restaurant-billing-software";

export const metadata: Metadata = keywordMetadata(SLUG, "gu");

export default function RestaurantBillingSoftwarePageGu() {
  return <KeywordRoute slug={SLUG} lang="gu" />;
}
