"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { POLL_MS, SAFETY_RESYNC_MS } from "@/lib/realtime/polling";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import { alertNewOrders } from "@/lib/utils/orderNotification";
import { COUNTER_SOUND, useSoundPref, useUnlockAlertsOnFirstTap } from "@/lib/utils/soundPref";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { MenuDTO, OrderDTO, TableDTO } from "@/types";

interface Needs {
  /** Seat grid: tables with who holds each QR. */
  tables?: boolean;
  /** Menu tree, only to name each item's kitchen. */
  menus?: boolean;
  /**
   * What the page already rendered on the server. With this the screen opens
   * with its data instead of fetching it again on mount — the first screen
   * after the PIN used to cost a document and two API calls before anything
   * but a skeleton was on it.
   */
  initial?: { orders?: OrderDTO[]; tables?: TableDTO[] };
}

/**
 * What the counter screens show — running orders always, tables and the
 * menu only for screens that ask (each one is an API call). Pusher pushes
 * refreshes; polling covers the gaps. Beeps when a new order arrives.
 */
export function useCounterData(needs: Needs = {}) {
  const wantTables = needs.tables === true;
  const wantMenus = needs.menus === true;
  const { initial } = needs;
  const { t, lang } = useI18n();
  const [orders, setOrders] = useState<OrderDTO[]>(initial?.orders ?? []);
  const [tables, setTables] = useState<TableDTO[]>(initial?.tables ?? []);
  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  // Seeded from the server's copy when there is one, so the first refresh
  // after that only chimes for orders that arrived since — not for every
  // ticket that was already on the screen.
  const knownIds = useRef<Set<string> | null>(initial?.orders ? new Set(initial.orders.map((order) => order.id)) : null);
  /** True until the mount effect has decided not to refetch what the server already sent. */
  const seeded = useRef(Boolean(initial));
  const [soundOn] = useSoundPref(COUNTER_SOUND);
  const soundRef = useRef(soundOn);
  useUnlockAlertsOnFirstTap();

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
      // Chime + notify for guest orders this screen hasn't seen yet (never on the first load). Orders the
      // counter typed in itself (parcels, table orders) don't ring back at the person who just sent them.
      if (knownIds.current) {
        const seen = knownIds.current;
        alertNewOrders(
          next.filter((order) => !seen.has(order.id) && order.source !== "COUNTER"),
          { t, lang, sound: soundRef.current }
        );
      }
      knownIds.current = new Set(next.map((order) => order.id));
      setOrders(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("err.ordersLoad"));
    } finally {
      setLoading(false);
    }
  }, [t, lang]);

  const loadTables = useCallback(async () => {
    if (!wantTables) return;
    const res = await fetch("/api/tables");
    if (redirectToLoginIfUnauthorized(res)) return;
    const data = await res.json().catch(() => null);
    if (res.ok) setTables(data.tables);
  }, [wantTables]);

  const loadMenus = useCallback(async () => {
    if (!wantMenus) return;
    const res = await fetch("/api/menu");
    if (redirectToLoginIfUnauthorized(res)) return;
    const data = await res.json().catch(() => null);
    if (res.ok) setMenus(data.menus);
  }, [wantMenus]);

  const resync = useCallback(() => {
    void loadOrders();
    void loadTables();
  }, [loadOrders, loadTables]);

  useEffect(() => {
    if (seeded.current) {
      // The page handed this screen its first copy; realtime and the periodic
      // resync take it from here. A later run (the language changed) fetches.
      seeded.current = false;
      void loadMenus();
      return;
    }
    resync();
    void loadMenus();
  }, [resync, loadMenus]);

  // Each event reloads only what it can change. Anything that touches a table (a guest's
  // order, add item, cancel, settle, free) also sends SEAT_UPDATED, so order events only
  // reload orders and the seat grid reloads once per change.
  const { state } = useRealtime(
    {
      [REALTIME_EVENTS.ORDER_CREATED]: loadOrders,
      [REALTIME_EVENTS.ORDER_ITEMS_READY]: loadOrders,
      [REALTIME_EVENTS.ORDER_READY]: loadOrders,
      [REALTIME_EVENTS.ORDER_COMPLETED]: loadOrders,
      [REALTIME_EVENTS.ORDER_CANCELLED]: loadOrders,
      [REALTIME_EVENTS.SEAT_UPDATED]: loadTables,
      [REALTIME_EVENTS.MENU_UPDATED]: loadMenus,
    },
    resync
  );

  usePeriodicRefresh(resync, state === "connected" ? SAFETY_RESYNC_MS : POLL_MS);

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
