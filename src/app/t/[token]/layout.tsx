import type { Metadata } from "next";
import type { ReactNode } from "react";

// Table QR pages are private to whoever is sitting there — keep them out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Phone-width column on a grey backdrop that always covers the whole screen (also on wide screens). */
export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-200">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">{children}</div>
    </div>
  );
}
