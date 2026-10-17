import type { Metadata } from "next";
import { KeywordRoute, keywordMetadata } from "@/lib/site/keywordRoute";

const SLUG = "restaurant-management-software";

export const metadata: Metadata = keywordMetadata(SLUG, "en");

export default function RestaurantManagementSoftwarePage() {
  return <KeywordRoute slug={SLUG} lang="en" />;
}
