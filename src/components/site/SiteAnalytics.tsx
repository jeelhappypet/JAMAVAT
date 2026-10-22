"use client";

import { useEffect } from "react";
import type { Lang } from "@/lib/i18n/messages";

/**
 * Counts one view of this page and every press of a `data-track` button,
 * for HQ's Website tab.
 *
 * `sendBeacon` rather than `fetch`: it hands the request to the browser and
 * returns, so a tap on "Book a free demo" is never waiting on a counter, and
 * the request still goes out while the page is being replaced.
 *
 * A view is counted once per page per tab, kept in `sessionStorage` — not a
 * cookie, nothing that survives the tab, and nothing that identifies anyone.
 * Someone who reads the page, goes to pricing and comes back is one visit,
 * which is the number HQ actually wants.
 */
const VIEWED_KEY = "jamavat.viewed";

function send(payload: { path: string; lang: Lang; kind: "view" | "click"; label: string }) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon?.(/* url */ "/api/site/stats", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/site/stats", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    // Counting is never allowed to break the page.
  }
}

/** sessionStorage throws in a private window and in an embedded preview. */
function alreadyViewed(path: string): boolean {
  try {
    const seen = JSON.parse(sessionStorage.getItem(VIEWED_KEY) || "[]") as string[];
    if (seen.includes(path)) return true;
    sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...seen, path].slice(-20)));
    return false;
  } catch {
    return false;
  }
}

/**
 * Counts something that is not a button press — a form that went through,
 * say. The path comes from the address bar, since the caller is inside the
 * page being counted.
 */
export function trackSiteEvent(label: string, lang: Lang) {
  send({ path: window.location.pathname, lang, kind: "click", label });
}

export function SiteAnalytics({ lang, path }: { lang: Lang; path: string }) {
  useEffect(() => {
    if (!alreadyViewed(path)) send({ path, lang, kind: "view", label: "page" });

    // One delegated listener for the whole page rather than a handler per
    // button: the buttons are in server components, which cannot carry one.
    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest?.("[data-track]");
      const label = target?.getAttribute("data-track");
      if (label) send({ path, lang, kind: "click", label });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [lang, path]);

  return null;
}
