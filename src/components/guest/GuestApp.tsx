"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuestMenuView } from "@/components/guest/GuestMenuView";
import { GuestCartView } from "@/components/guest/GuestCartView";
import { GuestVerifyView } from "@/components/guest/GuestVerifyView";
import { GuestStatusView } from "@/components/guest/GuestStatusView";
import { GuestBusyView } from "@/components/guest/GuestBusyView";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { GUEST_PUSH_CONFIGURED, useGuestRealtime, usePageVisible } from "@/lib/realtime/useGuestRealtime";
import { guestUrlFor, startView, viewFromSearch, type GuestView } from "@/lib/guest/view";
import type { GuestStateDTO, MenuDTO, MenuItemDTO } from "@/types";

interface GuestAppProps {
  token: string;
  restaurantName: string;
  initialMenus: MenuDTO[];
  initialState: GuestStateDTO;
  /** Step from the URL (?v=), so a reload or a back/forward lands where the guest was. */
  initialView?: GuestView;
}

/** How old the menu may be before it's worth refetching (sold-out changes). */
const MENU_STALE_MS = 120000;

const viewFromUrl = () => viewFromSearch(new URLSearchParams(window.location.search).get("v") ?? undefined);

/**
 * The guest's whole QR flow on one page (menu → cart → email OTP → status),
 * with the phone's back button moving between steps. The cart survives a
 * reload in localStorage; everything else comes from the server.
 */
export function GuestApp({ token, restaurantName, initialMenus, initialState, initialView }: GuestAppProps) {
  const { t } = useI18n();
  const [menus, setMenus] = useState(initialMenus);
  const [state, setState] = useState(initialState);
  const [view, setView] = useState<GuestView>(() => initialView ?? startView(initialState));
  const [browsing, setBrowsing] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const clientRequestId = useRef<string>(crypto.randomUUID());
  const stateRef = useRef(initialState);
  /** Read by the popstate listener, which is registered once. */
  const countRef = useRef(0);
  const cartKey = `jamavat:cart:${token}`;

  useEffect(() => {
    stateRef.current = state;
  });

  // ---- navigation
  // Each step is a history entry *and* a URL (?v=), because a phone browser
  // often reloads the document when the guest goes back. Without the URL the
  // step would be recomputed from scratch and the guest would be dropped back
  // on the "order placed" screen instead of the step they came from.
  const urlFor = (next: GuestView) => guestUrlFor(window.location.pathname, next);

  const go = useCallback((next: GuestView) => {
    setView(next);
    window.history.pushState({ guestView: next }, "", urlFor(next));
    window.scrollTo(0, 0);
  }, []);

  /** Same, without adding a history entry — for steps the guest must not come back to. */
  const replace = useCallback((next: GuestView) => {
    setView(next);
    window.history.replaceState({ guestView: next }, "", urlFor(next));
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    window.history.replaceState({ guestView: view }, "", urlFor(view));
    const onPop = () => {
      const next = viewFromUrl() ?? "menu";
      // Going back past a placed order lands on the cart or verify step it came
      // from, both now empty — show the menu instead of a dead screen.
      if ((next === "cart" || next === "verify") && countRef.current === 0) {
        setView("menu");
        window.history.replaceState({ guestView: "menu" }, "", urlFor("menu"));
        return;
      }
      setView(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- register once with the first view
  }, []);

  // ---- cart persistence
  useEffect(() => {
    try {
      // A finished sitting starts the next one empty — nothing of the last guest's cart survives.
      if (stateRef.current.ended && stateRef.current.lock !== "mine") {
        localStorage.removeItem(cartKey);
        return;
      }
      const saved = JSON.parse(localStorage.getItem(cartKey) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved cart once on mount
      if (saved && typeof saved === "object") setCart(saved.items ?? {});
      if (saved?.note) setNote(String(saved.note));
    } catch {
      // storage blocked — the cart just doesn't survive a reload
    }
  }, [cartKey]);

  useEffect(() => {
    try {
      localStorage.setItem(cartKey, JSON.stringify({ items: cart, note }));
    } catch {
      // ignore
    }
  }, [cart, note, cartKey]);

  // ---- server sync
  const refreshState = useCallback(async () => {
    const res = await fetch(`/api/guest/state?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return;
    const next: GuestStateDTO = await res.json();
    // The counter settled (or freed) this table while the guest was looking: thank them and
    // reset everything — cart, note, verified email — so the next guest starts clean.
    if (next.lock !== "mine" && stateRef.current.lock === "mine") {
      setCart({});
      setNote("");
      clientRequestId.current = crypto.randomUUID();
      if (next.ended) setView("status");
    }
    setState(next);
  }, [token]);

  // 0 until the first refresh; the page was server-rendered with a fresh menu,
  // so staleness is measured from when this screen opened.
  const menuLoadedAt = useRef(0);
  const refreshMenu = useCallback(async () => {
    menuLoadedAt.current = Date.now();
    const res = await fetch(`/api/guest/menu?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    if (res.ok) setMenus((await res.json()).menus);
  }, [token]);

  /** Only worth asking again if the copy on screen has gone stale. */
  const refreshMenuIfStale = useCallback(() => {
    if (Date.now() - menuLoadedAt.current > MENU_STALE_MS) void refreshMenu();
  }, [refreshMenu]);

  useEffect(() => {
    menuLoadedAt.current = Date.now();
  }, []);

  // Pusher nudges this phone when the counter changes its table (cancel, add item, settle, free);
  // polling is only the fallback. A phone just browsing a free QR has nothing to wait for, and
  // one looking at someone else's QR only checks now and then whether it has freed up.
  const mine = state.lock === "mine";
  const visible = usePageVisible();
  const live = useGuestRealtime(token, refreshState, mine && visible);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refreshState();
    };
    const every = mine ? (live ? 120000 : 10000) : state.lock === "taken" ? 30000 : 0;
    const interval = every ? setInterval(tick, every) : undefined;
    // With push, coming back on screen reconnects and that refetches once already.
    const onShow = mine && GUEST_PUSH_CONFIGURED ? null : tick;
    if (onShow) document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(interval);
      if (onShow) document.removeEventListener("visibilitychange", onShow);
    };
  }, [mine, live, state.lock, refreshState]);

  // Sold-out changes aren't pushed to guests. A menu left open on the table
  // doesn't need a timer asking every couple of minutes: it is refetched when
  // the phone comes back to the page with a stale copy, and again when the
  // guest opens the cart. Placing an order re-checks on the server anyway.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === "visible") refreshMenuIfStale();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [refreshMenuIfStale]);

  // ---- cart helpers
  const itemsById = useMemo(() => {
    const map = new Map<string, MenuItemDTO>();
    menus.forEach((menu) => menu.categories.forEach((category) => category.items.forEach((item) => map.set(item.id, item))));
    return map;
  }, [menus]);

  const setQty = useCallback((id: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const qty = Math.max(0, Math.min(20, (next[id] ?? 0) + delta));
      if (qty === 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }, []);

  // Dishes that disappeared or sold out since they were added drop out of the count.
  const lines = Object.entries(cart).filter(([id]) => itemsById.get(id)?.isAvailable);
  const count = lines.reduce((sum, [, qty]) => sum + qty, 0);
  useEffect(() => {
    countRef.current = count;
  });
  const total = lines.reduce((sum, [id, qty]) => sum + (itemsById.get(id)?.price ?? 0) * qty, 0);

  // ---- placing
  const placeOrder = useCallback(async () => {
    if (lines.length === 0) return;
    setPlacing(true);
    setOrderError(null);
    try {
      const res = await fetch("/api/guest/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          items: lines.map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
          note: note.trim() || undefined,
          clientRequestId: clientRequestId.current,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401 && data?.code === "VERIFY") {
        setState((prev) => ({ ...prev, verifiedEmail: undefined }));
        go("verify");
        return;
      }
      if (res.status === 409 && data?.code === "SEAT_TAKEN") {
        await refreshState();
        go("busy");
        return;
      }
      if (!res.ok) {
        setOrderError(data?.error ?? t("err.orderFailed"));
        if (view !== "cart") go("cart");
        void refreshMenu();
        return;
      }
      clientRequestId.current = crypto.randomUUID();
      setCart({});
      setNote("");
      await refreshState();
      // Replaces the cart/verify step: once the kitchen has the order, going
      // back must not offer to send it again.
      replace("status");
    } finally {
      setPlacing(false);
    }
  }, [lines, note, token, go, replace, refreshState, refreshMenu, t, view]);

  const startCheckout = useCallback(() => {
    if (state.verifiedEmail) void placeOrder();
    else go("verify");
  }, [state.verifiedEmail, placeOrder, go]);

  const forgetEmail = useCallback(async () => {
    await fetch("/api/guest/forget", { method: "POST" });
    setState((prev) => ({ ...prev, verifiedEmail: undefined }));
  }, []);

  const common = { restaurantName, state };

  if (view === "busy" && !browsing) {
    return (
      <GuestBusyView
        {...common}
        onBrowse={() => {
          setBrowsing(true);
          go("menu");
        }}
      />
    );
  }
  if (view === "cart") {
    return (
      <GuestCartView
        {...common}
        menus={menus}
        cart={cart}
        note={note}
        onNote={setNote}
        onQty={setQty}
        count={count}
        total={total}
        placing={placing}
        error={orderError}
        onBack={() => window.history.back()}
        onPlace={startCheckout}
        onForget={forgetEmail}
      />
    );
  }
  if (view === "verify") {
    return (
      <GuestVerifyView
        {...common}
        token={token}
        placing={placing}
        onBack={() => window.history.back()}
        onVerified={(email) => {
          setState((prev) => ({ ...prev, verifiedEmail: email }));
          void placeOrder();
        }}
      />
    );
  }
  if (view === "status") {
    return <GuestStatusView {...common} menus={menus} onOrderMore={() => go("menu")} />;
  }
  return (
    <GuestMenuView
      {...common}
      menus={menus}
      cart={cart}
      onQty={setQty}
      count={count}
      total={total}
      readOnly={state.lock === "taken"}
      onCart={() => {
        setOrderError(null);
        refreshMenuIfStale();
        go("cart");
      }}
      onOrders={() => go("status")}
    />
  );
}
