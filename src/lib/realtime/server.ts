import type { Server as IOServer } from "socket.io";
import type { RealtimeEvent } from "./events";

declare global {
  var __jamavatIO: IOServer | undefined;
}

export function setIO(io: IOServer) {
  globalThis.__jamavatIO = io;
}

export function getIO(): IOServer | undefined {
  return globalThis.__jamavatIO;
}

/**
 * Broadcasts a realtime event to all connected clients, if the socket
 * server has been initialized in this process. Realtime is a notification
 * layer only — MongoDB stays authoritative, so a missed emit (e.g. on a
 * cold serverless instance that never saw a client connect) cannot cause
 * incorrect state, only a delayed UI update until the next resync/poll.
 */
export function emitRealtimeEvent(event: RealtimeEvent, payload: unknown) {
  getIO()?.emit(event, payload);
}
