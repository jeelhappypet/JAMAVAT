"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { POLL_MS, SAFETY_RESYNC_MS } from "@/lib/realtime/polling";
import { playNewOrderBeep } from "@/lib/utils/beep";
import { COUNTER_SOUND, useSoundPref, useUnlockSoundOnFirstTap } from "@/lib/utils/soundPref";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { MenuDTO, OrderDTO, TableDTO } from "@/types";

/**
 * Everything the counter screens show — running orders, tables with their
 * QR state, and the menu (to name each item's kitchen). Pusher pushes
 * refreshes; polling covers the gaps. Beeps when a new order arrives.
 */
export function useCounterData() {
  const { t, lang } = useI18n();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const knownIds = useRef<Set<string> | null>(null);
  const [soundOn] = useSoundPref(COUNTER_SOUND);
  const soundRef = useRef(soundOn);
  useUnlockSoundOnFirstTap();

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/live");
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      const next: OrderDTO[] = data.orders;
      // Beep for orders this screen hasn't seen yet (never on the first load).
      if (knownIds.current && soundRef.current && next.some((order) => !knownIds.current!.has(order.id))) playNewOrderBeep();
      knownIds.current = new Set(next.map((order) => order.id));
      setOrders(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("err.ordersLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadTables = useCallback(async () => {
    const res = await fetch("/api/tables");
    if (redirectToLoginIfUnauthorized(res)) return;
    const data = await res.json().catch(() => null);
    if (res.ok) setTables(data.tables);
  }, []);

  const loadMenus = useCallback(async () => {
    const res = await fetch("/api/menu");
    if (redirectToLoginIfUnauthorized(res)) return;
    const data = await res.json().catch(() => null);
    if (res.ok) setMenus(data.menus);
  }, []);

  const resync = useCallback(() => {
    void loadOrders();
    void loadTables();
  }, [loadOrders, loadTables]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    resync();
    void loadMenus();
  }, [resync, loadMenus]);

  const { state } = useRealtime(
    {
      [REALTIME_EVENTS.ORDER_CREATED]: resync,
      [REALTIME_EVENTS.ORDER_ITEMS_READY]: resync,
      [REALTIME_EVENTS.ORDER_READY]: resync,
      [REALTIME_EVENTS.ORDER_COMPLETED]: resync,
      [REALTIME_EVENTS.ORDER_CANCELLED]: resync,
      [REALTIME_EVENTS.SEAT_UPDATED]: resync,
      [REALTIME_EVENTS.MENU_UPDATED]: loadMenus,
    },
    resync
  );

  useEffect(() => {
    const interval = setInterval(resync, state === "connected" ? SAFETY_RESYNC_MS : POLL_MS);
    return () => clearInterval(interval);
  }, [state, resync]);

  // "12 min", "New order" and ticket ages move along without refetching.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const act = useCallback(
    async (id: string, url: string, method = "PATCH") => {
      setError(null);
      setBusyIds((prev) => new Set(prev).add(id));
      try {
        const res = await fetch(url, { method });
        if (redirectToLoginIfUnauthorized(res)) return;
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? t("err.saveFailed"));
        }
      } finally {
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        resync();
      }
    },
    [resync, t]
  );

  /** categoryId → the menu it belongs to ("Gujarati"), which is the kitchen it goes to. */
  const kitchenByCategory = useMemo(() => {
    const map = new Map<string, string>();
    menus.forEach((menu) => menu.categories.forEach((category) => map.set(category.id, localName(lang, menu.name, menu.nameGu))));
    return map;
  }, [menus, lang]);

  return { orders, tables, menus, loading, error, busyIds, now, act, resync, kitchenByCategory, multiMenu: menus.length > 1 };
}

export type CounterData = ReturnType<typeof useCounterData>;

export function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}
