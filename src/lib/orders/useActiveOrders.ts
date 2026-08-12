"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { OrderDTO } from "@/types";

const POLL_MS = 5000;

type Mode = "live" | "pending";

const ENDPOINT: Record<Mode, string> = {
  live: "/api/orders/live",
  pending: "/api/orders/pending",
};

/**
 * Shared data source for Live Order (counter, mode "live") and Pending
 * Order (kitchen, mode "pending"). Realtime events update the list
 * instantly when a socket connection is available; a periodic poll and a
 * resync-on-reconnect are the correctness backstop, not just a fallback —
 * on some hosting setups realtime may never connect at all (no persistent
 * process to hold a socket), so nothing here may assume it will.
 *
 * The kitchen marking an order ready must remove it from "pending" (it
 * only shows PENDING) but must NOT remove it from "live" (which shows
 * PENDING + READY) — only the counter's own complete/cancel does that.
 */
export function useActiveOrders(mode: Mode) {
  const endpoint = ENDPOINT[mode];
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
      [REALTIME_EVENTS.ORDER_READY]: (payload) => {
        const { id } = payload as { id: string };
        if (mode === "pending") {
          setOrders((prev) => prev.filter((o) => o.id !== id));
        } else {
          setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "READY" } : o)));
        }
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
