import type { Metadata } from "next";
import type { ReactNode } from "react";

// Table QR pages are private to whoever is sitting there — keep them out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function GuestLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-1 justify-center bg-stone-200">{children}</div>;
}
