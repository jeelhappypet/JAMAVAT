import type { Metadata } from "next";
import { requirePageStaff } from "@/lib/auth/page";
import { homePathFor } from "@/lib/auth/access";
import { missingSendVars } from "@/lib/whatsapp/config";
import { WhatsAppInbox } from "@/components/whatsapp/WhatsAppInbox";

export const metadata: Metadata = { title: "WhatsApp" };

/** Full-screen WhatsApp inbox (its own header — the staff tab bars are left untouched). */
export default async function WhatsAppPage({ params }: PageProps<"/r/[slug]/whatsapp">) {
  const { slug } = await params;
  const staff = await requirePageStaff(slug, "/whatsapp");

  return <WhatsAppInbox canSend={missingSendVars().length === 0} homeHref={homePathFor(staff.role)} />;
}
