"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Pusher, { type Channel } from "pusher-js";
import type { RealtimeConnectionState } from "@/components/realtime/RealtimeStatus";
import { useOptionalRestaurantId } from "@/components/shell/RestaurantProvider";
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
export function useRealtime(handlers: EventHandlers, onReconnect?: () => void, channelOf?: (restaurantId: string) => string, forRestaurantId?: string | null) {
  // Channels are keyed by the restaurant's id, which never changes (a slug can
  // be renamed). HQ passes the id in, because it has no restaurant provider.
  const fromContext = useOptionalRestaurantId();
  const restaurantId = forRestaurantId ?? fromContext;
  const name = restaurantId ? (channelOf ?? staffChannel)(restaurantId) : null;
  const names = useMemo(() => (name ? [name] : []), [name]);
  return useRealtimeChannels(names, handlers, onReconnect);
}

/**
 * The same thing over several channels at once, for a screen that is not one
 * restaurant's. HQ's WhatsApp inbox lists every restaurant's chats, so it
 * subscribes to every restaurant's channel; they all ride the one shared
 * connection, so this costs nothing against Pusher's connection limit.
 *
 * It reports "connected" only when every channel is subscribed — a partly
 * connected inbox would quietly stop showing one restaurant's messages, and
 * the caller uses this state to decide how hard to poll.
 */
export function useRealtimeChannels(channelNames: string[], handlers: EventHandlers, onReconnect?: () => void) {
  // The array identity changes on every render; its contents are what matter.
  const key = channelNames.join(",");
  // No channel to subscribe to is the same as no Pusher: say disconnected
  // rather than "connecting" for ever.
  const [state, setState] = useState<RealtimeConnectionState>(() =>
    PUSHER_KEY && PUSHER_CLUSTER && channelNames.length > 0 ? "connecting" : "disconnected"
  );
  const handlersRef = useRef(handlers);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    handlersRef.current = handlers;
    onReconnectRef.current = onReconnect;
  });

  useEffect(() => {
    const wanted = key ? key.split(",") : [];
    if (wanted.length === 0) return;
    const connections = wanted.map((one) => getShared(one)).filter((one) => one !== null);
    if (connections.length === 0) return;
    const pusher = connections[0].pusher;
    const subscriptions = connections.map((one) => one.channel);

    const update = () => setState(toState(pusher.connection.state, subscriptions.every((channel) => channel.subscribed)));

    // `onReconnect` exists to close the gap a dropped connection leaves. The
    // first subscription is not a gap: the screen has just mounted and
    // fetched. Calling it there meant every staff screen asked for its data
    // twice on every load — two /api/reports/today on the admin's landing
    // page, two /api/orders/live on the counter's.
    const subscribedBefore = new Set<string>();
    const onSubscribedFor = (channelName: string) => () => {
      update();
      if (subscribedBefore.has(channelName)) onReconnectRef.current?.();
      subscribedBefore.add(channelName);
    };
    const onEvent = (eventName: string, payload: unknown) => {
      if (eventName.startsWith("pusher:")) return;
      handlersRef.current[eventName]?.(payload);
    };

    const bound = subscriptions.map((channel) => ({ channel, onSubscribed: onSubscribedFor(channel.name) }));
    pusher.connection.bind("state_change", update);
    for (const { channel, onSubscribed } of bound) {
      channel.bind("pusher:subscription_succeeded", onSubscribed);
      channel.bind("pusher:subscription_error", update);
      channel.bind_global(onEvent);
    }
    update();

    return () => {
      pusher.connection.unbind("state_change", update);
      for (const { channel, onSubscribed } of bound) {
        channel.unbind("pusher:subscription_succeeded", onSubscribed);
        channel.unbind("pusher:subscription_error", update);
        channel.unbind_global(onEvent);
      }
    };
  }, [key]);

  // With nothing to subscribe to there is nothing to report, and the last
  // state from a previous set of channels would be stale.
  return { state: key ? state : ("disconnected" as RealtimeConnectionState) };
}
