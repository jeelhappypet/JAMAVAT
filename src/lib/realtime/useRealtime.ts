"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { RealtimeConnectionState } from "@/components/realtime/RealtimeStatus";

type EventHandlers = Record<string, (payload: unknown) => void>;

/**
 * Connects to the Socket.IO server and wires up event handlers. Always
 * calls `onReconnect` right after a (re)connect so the caller can refetch
 * authoritative state from the API — the socket is a notification layer,
 * never the source of truth.
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
    const socket: Socket = io({ path: "/api/socket", transports: ["websocket"] });

    socket.on("connect", () => {
      if (cancelled) return;
      setState("connected");
      onReconnectRef.current?.();
    });
    socket.on("disconnect", () => {
      if (!cancelled) setState("disconnected");
    });
    socket.io.on("reconnect_attempt", () => {
      if (!cancelled) setState("connecting");
    });

    for (const [event] of Object.entries(handlersRef.current)) {
      socket.on(event, (payload) => handlersRef.current[event]?.(payload));
    }

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  return { state };
}
