"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { OrderDTO } from "@/types";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";

/** Without Pusher: poll so the screen is never more than a few seconds behind. */
export const POLL_MS = 5000;
/** With Pusher: a quiet safety resync in case a push was missed. */
export const SAFETY_RESYNC_MS = 60000;

/**
 * The counter's Live Order list (PENDING + READY). Pusher events update it
 * instantly; polling covers the time realtime is unavailable. Kitchens
 * marking an order ready must never remove it here — only the counter's own
 * complete/cancel does that.
 */
export function useActiveOrders() {
  const endpoint = "/api/orders/live";
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      if (redirectToLoginIfUnauthorized(res)) return;
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders);
      setError(null);
    } catch {
      setError("ઓર્ડર લાવી શકાયા નથી");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const removeOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    refetch();
  }, [refetch]);

  const { state } = useRealtime(
    {
      [REALTIME_EVENTS.ORDER_CREATED]: (payload) => {
        const order = payload as OrderDTO;
        setOrders((prev) => (prev.some((o) => o.id === order.id) ? prev : [...prev, order]));
      },
      [REALTIME_EVENTS.ORDER_READY]: (payload) => {
        const { id } = payload as { id: string };
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "READY" } : o)));
      },
      [REALTIME_EVENTS.ORDER_ITEMS_READY]: refetch,
      [REALTIME_EVENTS.ORDER_COMPLETED]: (payload) => {
        const { id } = payload as { id: string };
        setOrders((prev) => prev.filter((o) => o.id !== id));
      },
      [REALTIME_EVENTS.ORDER_CANCELLED]: (payload) => {
        const { id } = payload as { id: string };
        setOrders((prev) => prev.filter((o) => o.id !== id));
      },
    },
    refetch
  );

  useEffect(() => {
    const interval = setInterval(refetch, state === "connected" ? SAFETY_RESYNC_MS : POLL_MS);
    return () => clearInterval(interval);
  }, [state, refetch]);

  return { orders, loading, error, connectionState: state, refetch, removeOrder };
}
