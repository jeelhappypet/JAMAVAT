import type { Metadata } from "next";
import { OwnerLogin } from "@/components/auth/OwnerLogin";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function AccountLoginPage() {
  return <OwnerLogin />;
}
