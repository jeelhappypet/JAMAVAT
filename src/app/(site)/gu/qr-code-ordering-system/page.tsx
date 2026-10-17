import type { Metadata } from "next";
import { KeywordRoute, keywordMetadata } from "@/lib/site/keywordRoute";

const SLUG = "qr-code-ordering-system";

export const metadata: Metadata = keywordMetadata(SLUG, "gu");

export default function QrCodeOrderingSystemPageGu() {
  return <KeywordRoute slug={SLUG} lang="gu" />;
}
