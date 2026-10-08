import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage, homePathFor } from "@/lib/auth/access";
import { missingSendVars } from "@/lib/whatsapp/config";
import { WhatsAppInbox } from "@/components/whatsapp/WhatsAppInbox";

export const metadata: Metadata = { title: "WhatsApp" };

/** Full-screen WhatsApp inbox (its own header — the staff tab bars are left untouched). */
export default async function WhatsAppPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (!canAccessPage(staff.role, "/whatsapp")) redirect(homePathFor(staff.role));

  return <WhatsAppInbox canSend={missingSendVars().length === 0} homeHref={homePathFor(staff.role)} />;
}
