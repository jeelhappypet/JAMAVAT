import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

/** Google Search Console, URL-prefix property for https://jamavat.vercel.app — checked against `/`. */
export const metadata: Metadata = {
  verification: {
    google: "TB4cysLy0_EcKd0GyJ3vQHwCaJdyK6OBuhWtJjNU6lw",
  },
};

/**
 * The app screens lock zoom (a POS doesn't want pinch-zoom mid-service); the
 * website must not — it fails accessibility checks and search engines'
 * mobile-friendliness tests.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Viewports merge key by key — these replace the root layout's zoom lock rather than inherit it.
  maximumScale: 5,
  userScalable: true,
  themeColor: "#b2560a",
};

/**
 * Jamavat's own website. Deliberately plain: server-rendered, no service
 * worker, no staff session, nothing that needs JavaScript to read — this is
 * the page people find us with, so it has to be fast and crawlable.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Reveal.tsx leaves [data-reveal] sections at opacity:0 until its IntersectionObserver runs — show them at once if JS never does. */}
      <noscript>
        <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
      </noscript>
      {children}
    </div>
  );
}
