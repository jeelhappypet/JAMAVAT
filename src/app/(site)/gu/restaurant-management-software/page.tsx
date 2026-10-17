import type { Metadata } from "next";
import { KeywordRoute, keywordMetadata } from "@/lib/site/keywordRoute";

const SLUG = "restaurant-management-software";

export const metadata: Metadata = keywordMetadata(SLUG, "gu");

export default function RestaurantManagementSoftwarePageGu() {
  return <KeywordRoute slug={SLUG} lang="gu" />;
}
