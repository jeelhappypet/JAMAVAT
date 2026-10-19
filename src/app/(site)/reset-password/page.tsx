import type { Metadata } from "next";
import { ResetPassword } from "@/components/auth/ResetPassword";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPassword token={token} />;
}
