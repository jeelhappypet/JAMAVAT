"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/pwa/installPrompt";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Mounted in the restaurant's own layout (`r/[slug]/layout.tsx`), so the
    // browser's one-time install prompt is caught on the login screen, before
    // any screen with an "Install app" button renders.
    captureInstallPrompt();

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Never in development. The worker serves `/_next/static/` cache-first
    // (safe in production, where every chunk name carries a content hash) and
    // `next dev` reuses the same chunk URLs as their contents change — so a
    // screen would keep rendering the code it had when the tab first loaded,
    // which looks exactly like "my change didn't apply". Any worker left over
    // from a previous run is removed here, and its caches with it.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((workers) => workers.forEach((worker) => worker.unregister()));
      if ("caches" in window) void caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline shell is a progressive enhancement; ordering flows do not depend on it.
    });
  }, []);

  return null;
}
