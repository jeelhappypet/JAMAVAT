"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuestMenuView } from "@/components/guest/GuestMenuView";
import { GuestCartView } from "@/components/guest/GuestCartView";
import { GuestVerifyView } from "@/components/guest/GuestVerifyView";
import { GuestStatusView } from "@/components/guest/GuestStatusView";
import { GuestBusyView } from "@/components/guest/GuestBusyView";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { GuestStateDTO, MenuDTO, MenuItemDTO } from "@/types";

export type GuestView = "menu" | "cart" | "verify" | "status" | "busy";

interface GuestAppProps {
  token: string;
  restaurantName: string;
  initialMenus: MenuDTO[];
  initialState: GuestStateDTO;
}

const FINAL = new Set(["COMPLETED", "CANCELLED", "REJECTED"]);

/**
 * The guest's whole QR flow on one page (menu → cart → email OTP → status),
 * with the phone's back button moving between steps. The cart survives a
 * reload in localStorage; everything else comes from the server.
 */
export function GuestApp({ token, restaurantName, initialMenus, initialState }: GuestAppProps) {
  const { t } = useI18n();
  const [menus, setMenus] = useState(initialMenus);
  const [state, setState] = useState(initialState);
  const [view, setView] = useState<GuestView>(() => {
    if (initialState.lock === "taken") return "busy";
    return initialState.orders.some((order) => !FINAL.has(order.status)) ? "status" : "menu";
  });
  const [browsing, setBrowsing] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const clientRequestId = useRef<string>(crypto.randomUUID());
  // Lets the status screen say "your table was closed" instead of looking empty.
  const [hadOrders, setHadOrders] = useState(initialState.orders.length > 0);
  const cartKey = `jamavat:cart:${token}`;

  // ---- navigation: each step is a history entry, so the phone's back button works
  const go = useCallback((next: GuestView) => {
    setView(next);
    window.history.pushState({ guestView: next }, "");
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    window.history.replaceState({ guestView: view }, "");
    const onPop = (event: PopStateEvent) => setView((event.state?.guestView as GuestView) ?? "menu");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- register once with the first view
  }, []);

  // ---- cart persistence
  useEffect(() => {
    try {
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
    if (next.orders.length > 0) setHadOrders(true);
    setState(next);
  }, [token]);

  const refreshMenu = useCallback(async () => {
    const res = await fetch(`/api/guest/menu?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    if (res.ok) setMenus((await res.json()).menus);
  }, [token]);

  const hasActiveOrders = state.orders.some((order) => !FINAL.has(order.status));
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refreshState();
    };
    const interval = setInterval(tick, hasActiveOrders ? 5000 : 20000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [hasActiveOrders, refreshState]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refreshMenu();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshMenu]);

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
      go("status");
    } finally {
      setPlacing(false);
    }
  }, [lines, note, token, go, refreshState, refreshMenu, t, view]);

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
    return <GuestStatusView {...common} menus={menus} sessionEnded={hadOrders && state.orders.length === 0} onOrderMore={() => go("menu")} />;
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
        go("cart");
      }}
      onOrders={() => go("status")}
    />
  );
}
