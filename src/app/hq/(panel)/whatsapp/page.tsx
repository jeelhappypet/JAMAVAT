import type { Metadata } from "next";
import { missingSendVars } from "@/lib/whatsapp/config";
import { HqWhatsAppScreen } from "@/components/hq/HqWhatsAppScreen";

export const metadata: Metadata = { title: "WhatsApp — Jamavat HQ" };

export default function HqWhatsAppPage() {
  return <HqWhatsAppScreen canSend={missingSendVars().length === 0} />;
}
