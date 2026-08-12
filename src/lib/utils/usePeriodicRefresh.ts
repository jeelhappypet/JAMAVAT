"use client";

import { useEffect } from "react";

/**
 * Calls `callback` on a fixed interval for as long as the component is
 * mounted. This is the correctness backstop for every screen that shows
 * server data expected to change from other devices: realtime (Socket.IO)
 * is a notification layer only, and on standard serverless hosting a
 * client may never manage to hold a live connection at all (no persistent
 * process to attach to) — so nothing on screen may rely on realtime ever
 * firing to eventually become correct.
 */
export function usePeriodicRefresh(callback: () => void, intervalMs: number) {
  useEffect(() => {
    const interval = setInterval(callback, intervalMs);
    return () => clearInterval(interval);
  }, [callback, intervalMs]);
}
