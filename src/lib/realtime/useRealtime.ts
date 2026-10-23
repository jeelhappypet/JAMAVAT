"use client";

import { useEffect, useRef, useState } from "react";
import Pusher, { type Channel } from "pusher-js";
import type { RealtimeConnectionState } from "@/components/realtime/RealtimeStatus";
import { useRestaurant } from "@/components/shell/RestaurantProvider";
import { staffChannel } from "./events";

type EventHandlers = Record<string, (payload: unknown) => void>;

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

// One connection per page and one subscription per channel, shared by every hook on it.
let pusherClient: Pusher | null = null;
const channels = new Map<string, Channel>();

function getShared(channelName: string) {
  if (!PUSHER_KEY || !PUSHER_CLUSTER) return null;
  pusherClient ??= new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
  });
  let channel = channels.get(channelName);
  if (!channel) {
    channel = pusherClient.subscribe(channelName);
    channels.set(channelName, channel);
  }
  return { pusher: pusherClient, channel };
}

function toState(pusherState: string, subscribed: boolean): RealtimeConnectionState {
  if (pusherState === "connected" && subscribed) return "connected";
  if (pusherState === "connecting" || pusherState === "initialized" || pusherState === "connected") return "connecting";
  return "disconnected";
}

/**
 * Subscribes to the staff channel (or `channelName`) and wires up event handlers.
 *
 * `onReconnect` runs when the subscription succeeds *again* after a drop, so
 * the caller can refetch whatever it missed — push is a notification layer,
 * never the source of truth. It deliberately does not run on the first
 * subscription, where the screen has only just fetched for itself.
 *
 * Without NEXT_PUBLIC_PUSHER_* it reports "disconnected" and callers keep
 * polling.
 */
export function useRealtime(handlers: EventHandlers, onReconnect?: () => void, channelOf?: (restaurantId: string) => string) {
  // Channels are keyed by the restaurant's id, which never changes (a slug can be renamed).
  const { id: restaurantId } = useRestaurant();
  const channelName = (channelOf ?? staffChannel)(restaurantId);
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
    const connection = getShared(channelName);
    if (!connection) return;
    const { pusher, channel } = connection;

    const update = () => setState(toState(pusher.connection.state, channel.subscribed));

    // `onReconnect` exists to close the gap a dropped connection leaves. The
    // first subscription is not a gap: the screen has just mounted and
    // fetched. Calling it there meant every staff screen asked for its data
    // twice on every load — two /api/reports/today on the admin's landing
    // page, two /api/orders/live on the counter's.
    let subscribedBefore = false;
    const onSubscribed = () => {
      update();
      if (subscribedBefore) onReconnectRef.current?.();
      subscribedBefore = true;
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
  }, [channelName]);

  return { state };
}
