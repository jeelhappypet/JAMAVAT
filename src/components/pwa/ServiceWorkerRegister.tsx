"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/pwa/installPrompt";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Mounted in the root layout, so the browser's one-time install prompt is
    // caught even before a screen with an "Install app" button renders.
    captureInstallPrompt();

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline shell is a progressive enhancement; ordering flows do not depend on it.
    });
  }, []);

  return null;
}
