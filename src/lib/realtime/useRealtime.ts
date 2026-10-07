"use client";

import { useEffect, useRef, useState } from "react";
import Pusher, { type Channel } from "pusher-js";
import type { RealtimeConnectionState } from "@/components/realtime/RealtimeStatus";
import { STAFF_CHANNEL } from "./events";

type EventHandlers = Record<string, (payload: unknown) => void>;

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

// One connection + one channel subscription per page, shared by every hook on it.
let shared: { pusher: Pusher; channel: Channel } | null = null;

function getShared() {
  if (!PUSHER_KEY || !PUSHER_CLUSTER) return null;
  if (!shared) {
    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
    });
    shared = { pusher, channel: pusher.subscribe(STAFF_CHANNEL) };
  }
  return shared;
}

function toState(pusherState: string, subscribed: boolean): RealtimeConnectionState {
  if (pusherState === "connected" && subscribed) return "connected";
  if (pusherState === "connecting" || pusherState === "initialized" || pusherState === "connected") return "connecting";
  return "disconnected";
}

/**
 * Subscribes to the staff channel and wires up event handlers. Calls
 * `onReconnect` each time the subscription (re)succeeds so the caller can
 * refetch from the API — push is a notification layer, never the source of
 * truth. Without NEXT_PUBLIC_PUSHER_* it reports "disconnected" and callers
 * keep polling.
 */
export function useRealtime(handlers: EventHandlers, onReconnect?: () => void) {
  const [state, setState] = useState<RealtimeConnectionState>(() =>
    PUSHER_KEY && PUSHER_CLUSTER ? "connecting" : "disconnected"
  );
  const handlersRef = useRef(handlers);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    handlersRef.current = handlers;
    onReconnectRef.current = onReconnect;
  });

  useEffect(() => {
    const connection = getShared();
    if (!connection) return;
    const { pusher, channel } = connection;

    const update = () => setState(toState(pusher.connection.state, channel.subscribed));
    const onSubscribed = () => {
      update();
      onReconnectRef.current?.();
    };
    const onEvent = (eventName: string, payload: unknown) => {
      if (eventName.startsWith("pusher:")) return;
      handlersRef.current[eventName]?.(payload);
    };

    pusher.connection.bind("state_change", update);
    channel.bind("pusher:subscription_succeeded", onSubscribed);
    channel.bind("pusher:subscription_error", update);
    channel.bind_global(onEvent);
    update();

    return () => {
      pusher.connection.unbind("state_change", update);
      channel.unbind("pusher:subscription_succeeded", onSubscribed);
      channel.unbind("pusher:subscription_error", update);
      channel.unbind_global(onEvent);
    };
  }, []);

  return { state };
}
