export type RealtimeConnectionState = "connecting" | "connected" | "disconnected";

const LABELS: Record<RealtimeConnectionState, string> = {
  connecting: "જોડાણ થઈ રહ્યું છે…",
  connected: "લાઈવ",
  // Not an error state — data still refreshes automatically on a timer.
  // Realtime push may simply be unavailable on this hosting setup.
  disconnected: "સ્વયં તાજું થાય છે",
};

const DOT_CLASS: Record<RealtimeConnectionState, string> = {
  connecting: "bg-amber-500 animate-pulse",
  connected: "bg-success",
  disconnected: "bg-text-muted",
};

export function RealtimeStatus({ state }: { state: RealtimeConnectionState }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-text-muted">
      <span className={`h-2 w-2 rounded-full ${DOT_CLASS[state]}`} aria-hidden />
      {LABELS[state]}
    </span>
  );
}
