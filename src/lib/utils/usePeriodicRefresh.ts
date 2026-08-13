"use client";

import { useEffect } from "react";

/**
 * Calls `callback` on a fixed interval while enabled. Use as the
 * correctness backstop when realtime is disconnected — when Socket.IO is
 * connected, pass `enabled: false` and let push events drive updates.
 */
export function usePeriodicRefresh(callback: () => void, intervalMs: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(callback, intervalMs);
    return () => clearInterval(interval);
  }, [callback, intervalMs, enabled]);
}
