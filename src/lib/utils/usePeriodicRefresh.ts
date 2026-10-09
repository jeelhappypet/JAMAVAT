"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `callback` on a fixed interval **while the page is on screen**, and
 * once more when it comes back after being away longer than the interval.
 * A phone in a pocket or a tab behind others asks for nothing.
 *
 * Use as the correctness backstop for realtime: with Pusher connected, pass a
 * long interval (SAFETY_RESYNC_MS); without it, the short one (POLL_MS).
 */
export function usePeriodicRefresh(callback: () => void, intervalMs: number, enabled = true) {
  // Kept in a ref so a new callback identity each render doesn't restart the
  // interval — that alone used to fire extra requests.
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    let lastRun = Date.now();
    const run = () => {
      lastRun = Date.now();
      latest.current();
    };
    const tick = () => {
      if (document.visibilityState === "visible") run();
    };
    const onShow = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRun >= intervalMs) run();
    };

    const interval = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [intervalMs, enabled]);
}
