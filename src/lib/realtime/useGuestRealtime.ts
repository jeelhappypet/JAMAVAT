"use client";

import { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import { GUEST_UPDATE_EVENT, guestChannel } from "./events";

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

/**
 * Guest phones listen on their QR's public channel (no login, no data in
 * the messages) and refetch their own state when nudged. Returns whether
 * the push is live, so the page can poll slowly instead of every few seconds.
 */
export function useGuestRealtime(seatToken: string, onUpdate: () => void): boolean {
  const [live, setLive] = useState(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    if (!PUSHER_KEY || !PUSHER_CLUSTER) return;
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
    };
  }, [seatToken]);

  return live;
}
