import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HqLogin } from "@/components/hq/HqLogin";
import { getHqEmail, hqEmails } from "@/lib/hq/session";

export const metadata: Metadata = { title: "Jamavat HQ", robots: { index: false, follow: false } };

export default async function HqLoginPage() {
  if (await getHqEmail()) redirect("/hq");
  // With no HQ_EMAILS set nobody can get in — the screen says so instead of pretending to send a code.
  return <HqLogin configured={hqEmails().length > 0} />;
}
