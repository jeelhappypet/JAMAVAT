import Pusher from "pusher";
import { STAFF_CHANNEL, type RealtimeEvent } from "./events";

let client: Pusher | null | undefined;

/** null when the PUSHER_* env vars aren't set — screens then fall back to polling. */
export function getPusher(): Pusher | null {
  if (client !== undefined) return client;
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  client =
    PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER
      ? new Pusher({ appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER, useTLS: true })
      : null;
  return client;
}

/**
 * Pushes an event to every staff screen. Awaited by callers on purpose: on
 * Vercel a serverless function can be frozen right after it responds, so a
 * fire-and-forget HTTP call to Pusher might never leave. Never throws —
 * realtime is a notification layer; MongoDB stays the source of truth and
 * every screen still resyncs on its own.
 */
export async function emitRealtimeEvent(event: RealtimeEvent, payload: unknown): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;
  try {
    await pusher.trigger(STAFF_CHANNEL, event, payload);
  } catch (error) {
    console.error(`[realtime] ${event} not delivered`, error);
  }
}
