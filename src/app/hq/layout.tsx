import type { Metadata } from "next";
import type { ReactNode } from "react";

/** Jamavat HQ — the owner's own panel. Never indexed, never linked from the website. */
export const metadata: Metadata = { title: "Jamavat HQ", robots: { index: false, follow: false } };

export default function HqRootLayout({ children }: { children: ReactNode }) {
  return children;
}
