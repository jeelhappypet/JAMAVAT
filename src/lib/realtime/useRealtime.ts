"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { RealtimeConnectionState } from "@/components/realtime/RealtimeStatus";

type EventHandlers = Record<string, (payload: unknown) => void>;

// If a connection can't be established quickly, stop showing "connecting"
// forever — some hosting setups (e.g. standard serverless functions with
// no persistent process to hold a WebSocket open) may never succeed at
// all. The UI should read as "refreshing periodically instead," not "stuck."
const CONNECT_GRACE_MS = 8000;

/**
 * Connects to the Socket.IO server and wires up event handlers. Always
 * calls `onReconnect` right after a (re)connect so the caller can refetch
 * authoritative state from the API — the socket is a notification layer,
 * never the source of truth. Callers should keep a periodic refresh only
 * as a fallback while disconnected (see usePeriodicRefresh).
 *
 * The Pages API route at `/api/socket` must run once in this process before
 * Engine.IO traffic can succeed — it is what attaches Socket.IO to the
 * underlying Node HTTP server. Without that warm-up, websocket/polling
 * handshakes fail and the UI stays stuck on "connecting" / self-refresh.
 */
export function useRealtime(handlers: EventHandlers, onReconnect?: () => void) {
  const [state, setState] = useState<RealtimeConnectionState>("connecting");
  const handlersRef = useRef(handlers);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    handlersRef.current = handlers;
    onReconnectRef.current = onReconnect;
  });

  useEffect(() => {
    let cancelled = false;
    let everConnected = false;
    let socket: Socket | null = null;

    const graceTimer = setTimeout(() => {
      if (!cancelled && !everConnected) setState("disconnected");
    }, CONNECT_GRACE_MS);

    async function connect() {
      // Warm the Pages API route so Socket.IO is attached to the HTTP server.
      try {
        await fetch("/api/socket");
      } catch {
        // Another client may already have initialized the server — still try.
      }
      if (cancelled) return;

      socket = io({
        path: "/api/socket",
        // Polling first is required after warm-up on some Next.js setups;
        // Socket.IO then upgrades to websocket automatically.
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socket.on("connect", () => {
        if (cancelled) return;
        everConnected = true;
        clearTimeout(graceTimer);
        setState("connected");
        onReconnectRef.current?.();
      });
      socket.on("disconnect", () => {
        if (!cancelled) setState("disconnected");
      });
      socket.io.on("reconnect_attempt", () => {
        if (!cancelled && everConnected) setState("connecting");
      });
      socket.on("connect_error", () => {
        // Keep trying via Socket.IO's reconnection; grace timer flips the
        // badge to self-refresh if we never manage a first connect.
      });

      for (const [event] of Object.entries(handlersRef.current)) {
        socket.on(event, (payload) => handlersRef.current[event]?.(payload));
      }
    }

    void connect();

    return () => {
      cancelled = true;
      clearTimeout(graceTimer);
      socket?.disconnect();
    };
  }, []);

  return { state };
}
