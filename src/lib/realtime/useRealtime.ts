"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { RealtimeConnectionState } from "@/components/realtime/RealtimeStatus";

type EventHandlers = Record<string, (payload: unknown) => void>;

// Must match src/pages/api/socket.ts — Engine.IO lives here, warm-up stays on /api/socket.
const SOCKET_IO_PATH = "/socket.io";

const CONNECT_GRACE_MS = 4000;
const MAX_RECONNECT_ATTEMPTS = 2;

// One warm-up per page lifetime — avoids repeat /api/socket hits from every hook mount.
let warmUpPromise: Promise<"ready" | "unavailable"> | null = null;

function warmUpSocketServer(): Promise<"ready" | "unavailable"> {
  if (!warmUpPromise) {
    warmUpPromise = fetch("/api/socket")
      .then((res) =>
        res.headers.get("X-Jamavat-Realtime") === "unavailable" ? "unavailable" : "ready"
      )
      .catch(() => "ready");
  }
  return warmUpPromise;
}

/**
 * Connects to the Socket.IO server and wires up event handlers. Always
 * calls `onReconnect` right after a (re)connect so the caller can refetch
 * authoritative state from the API — the socket is a notification layer,
 * never the source of truth. Callers should poll only while disconnected.
 *
 * Warm-up hits `/api/socket` (Pages init). The live connection uses
 * `/socket.io` so Engine.IO never sees those warm-up GETs (which used to
 * surface as 400 "Transport unknown" after the server was already attached).
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

    function giveUp() {
      if (cancelled || everConnected) return;
      setState("disconnected");
      socket?.disconnect();
    }

    const graceTimer = setTimeout(giveUp, CONNECT_GRACE_MS);

    async function connect() {
      const availability = await warmUpSocketServer();
      if (cancelled) return;

      if (availability === "unavailable") {
        clearTimeout(graceTimer);
        setState("disconnected");
        return;
      }

      socket = io({
        path: SOCKET_IO_PATH,
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1500,
        timeout: 4000,
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
      socket.io.on("reconnect_failed", () => {
        if (!cancelled) {
          setState("disconnected");
          socket?.disconnect();
        }
      });
      socket.on("connect_error", () => {
        // Limited reconnectionAttempts + grace timer stop the spam.
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
