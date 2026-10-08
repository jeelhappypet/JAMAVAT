"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Pusher from "pusher-js";
import { GUEST_UPDATE_EVENT, guestChannel } from "./events";

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

/** False when Pusher isn't configured — the guest page then polls. */
export const GUEST_PUSH_CONFIGURED = Boolean(PUSHER_KEY && PUSHER_CLUSTER);

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** Whether this tab is on screen (a locked phone or a background tab is not). */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => true);
}

/**
 * Guest phones listen on their QR's public channel (no login, no data in
 * the messages) and refetch their own state when nudged. Returns whether
 * the push is live, so the page can poll slowly instead of every few seconds.
 *
 * `enabled` keeps the Pusher free plan's 100 connections for phones that
 * need them: only a guest with an open sitting, only while the page is on
 * screen. Reconnecting fetches the state once to catch up.
 */
export function useGuestRealtime(seatToken: string, onUpdate: () => void, enabled: boolean): boolean {
  const [live, setLive] = useState(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    if (!enabled || !PUSHER_KEY || !PUSHER_CLUSTER) return;
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
    const channel = pusher.subscribe(guestChannel(seatToken));
    const sync = () => setLive(pusher.connection.state === "connected" && channel.subscribed);
    const onSubscribed = () => {
      sync();
      onUpdateRef.current(); // catch up on anything missed while connecting
    };
    channel.bind("pusher:subscription_succeeded", onSubscribed);
    channel.bind(GUEST_UPDATE_EVENT, () => onUpdateRef.current());
    pusher.connection.bind("state_change", sync);
    return () => {
      pusher.connection.unbind("state_change", sync);
      pusher.unsubscribe(guestChannel(seatToken));
      pusher.disconnect();
      setLive(false);
    };
  }, [seatToken, enabled]);

  return enabled && live;
}
