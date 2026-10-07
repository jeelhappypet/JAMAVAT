"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";

export type RealtimeConnectionState = "connecting" | "connected" | "disconnected";

const LABELS: Record<RealtimeConnectionState, MessageKey> = {
  connecting: "realtime.connecting",
  connected: "realtime.live",
  // Not an error state — without Pusher the screen refreshes itself on a timer.
  disconnected: "realtime.polling",
};

const DOT_CLASS: Record<RealtimeConnectionState, string> = {
  connecting: "bg-amber-500 animate-pulse",
  connected: "bg-success",
  disconnected: "bg-text-muted",
};

export function RealtimeStatus({ state, tone = "light" }: { state: RealtimeConnectionState; tone?: "light" | "dark" }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${
        tone === "dark" ? "bg-stone-800 text-stone-200" : "bg-surface-muted text-stone-700"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${state === "connected" && tone === "dark" ? "bg-green-400" : DOT_CLASS[state]}`} aria-hidden />
      {t(LABELS[state])}
    </span>
  );
}
