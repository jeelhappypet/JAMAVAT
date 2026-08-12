"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { RealtimeConnectionState } from "@/components/realtime/RealtimeStatus";

type EventHandlers = Record<string, (payload: unknown) => void>;

// If a connection can't be established quickly, stop showing "connecting"
// forever — some hosting setups (e.g. standard serverless functions with
// no persistent process to hold a WebSocket open) may never succeed at
// all. The UI should read as "refreshing periodically instead," not "stuck."
const CONNECT_GRACE_MS = 6000;

/**
 * Connects to the Socket.IO server and wires up event handlers. Always
 * calls `onReconnect` right after a (re)connect so the caller can refetch
 * authoritative state from the API — the socket is a notification layer,
 * never the source of truth. Callers must have their own periodic refresh
 * (see usePeriodicRefresh) — realtime may never connect at all on some
 * hosts, and correctness can't depend on it.
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
    const socket: Socket = io({ path: "/api/socket", transports: ["websocket"] });

    const graceTimer = setTimeout(() => {
      if (!cancelled && !everConnected) setState("disconnected");
    }, CONNECT_GRACE_MS);

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

    for (const [event] of Object.entries(handlersRef.current)) {
      socket.on(event, (payload) => handlersRef.current[event]?.(payload));
    }

    return () => {
      cancelled = true;
      clearTimeout(graceTimer);
      socket.disconnect();
    };
  }, []);

  return { state };
}
