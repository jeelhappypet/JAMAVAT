"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { OrderDTO } from "@/types";

const POLL_MS = 20000;

/**
 * Shared data source for Live Order (counter) and Pending Order (kitchen) —
 * both screens show the same set of active PENDING orders. Realtime events
 * update the list instantly; a periodic poll and a resync-on-reconnect act
 * as a safety net so correctness never depends solely on socket delivery
 * (important since a serverless deployment may run each API route in a
 * separate process from the one holding live socket connections).
 */
export function useActiveOrders(endpoint: "/api/orders/live" | "/api/orders/pending") {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    refetch();
    const interval = setInterval(refetch, POLL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  const { state } = useRealtime(
    {
      [REALTIME_EVENTS.ORDER_CREATED]: (payload) => {
        const order = payload as OrderDTO;
        setOrders((prev) => (prev.some((o) => o.id === order.id) ? prev : [...prev, order]));
      },
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

  return { orders, loading, error, connectionState: state, refetch };
}
