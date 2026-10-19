import type { ReactNode } from "react";

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
