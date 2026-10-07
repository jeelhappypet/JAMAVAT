"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LoadingState } from "@/components/ui/LoadingState";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { POLL_MS, SAFETY_RESYNC_MS } from "@/lib/orders/useActiveOrders";
import { playNewOrderBeep, unlockSound } from "@/lib/utils/beep";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { KitchenScopeDTO, KitchenTicketDTO, MenuDTO, StaffRole } from "@/types";

interface KitchenScreenProps {
  staffName: string;
  role: StaffRole;
  restaurantName: string | null;
}

const LATE_AFTER_MINUTES = 12;
const SOUND_KEY = "jamavat:kitchen-sound";

/** The Kitchen artboard: only this login's categories, one ticket per order, sold-out switches on the side. */
export function KitchenScreen({ staffName, role, restaurantName }: KitchenScreenProps) {
  const { t, lang } = useI18n();
  const [tickets, setTickets] = useState<KitchenTicketDTO[]>([]);
  const [scope, setScope] = useState<KitchenScopeDTO | null>(null);
  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [soundOn, setSoundOn] = useState(false);
  const knownIds = useRef<Set<string> | null>(null);
  const soundRef = useRef(false);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/pending");
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      const next: KitchenTicketDTO[] = data.tickets;
      // Beep only for tickets this screen hasn't seen before (not on first load).
      if (knownIds.current && soundRef.current && next.some((ticket) => !knownIds.current!.has(ticket.orderId))) {
        playNewOrderBeep();
      }
      knownIds.current = new Set(next.map((ticket) => ticket.orderId));
      setTickets(next);
      setScope(data.scope);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("err.ordersLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadMenus = useCallback(async () => {
    const res = await fetch("/api/menu?activeOnly=1");
    if (redirectToLoginIfUnauthorized(res)) return;
    const data = await res.json().catch(() => null);
    if (res.ok) setMenus(data.menus);
  }, []);

  const resync = useCallback(() => {
    void loadTickets();
    void loadMenus();
  }, [loadTickets, loadMenus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    resync();
    try {
      if (localStorage.getItem(SOUND_KEY) === "on") setSoundOn(true);
    } catch {
      // storage blocked — sound just starts off
    }
  }, [resync]);

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const { state } = useRealtime(
    {
      [REALTIME_EVENTS.ORDER_CREATED]: loadTickets,
      [REALTIME_EVENTS.ORDER_ACCEPTED]: loadTickets,
      [REALTIME_EVENTS.ORDER_ITEMS_READY]: loadTickets,
      [REALTIME_EVENTS.ORDER_READY]: loadTickets,
      [REALTIME_EVENTS.ORDER_CANCELLED]: loadTickets,
      [REALTIME_EVENTS.ORDER_COMPLETED]: loadTickets,
      [REALTIME_EVENTS.MENU_UPDATED]: loadMenus,
      [REALTIME_EVENTS.ROUTING_UPDATED]: resync,
    },
    resync
  );

  useEffect(() => {
    const interval = setInterval(loadTickets, state === "connected" ? SAFETY_RESYNC_MS : POLL_MS);
    return () => clearInterval(interval);
  }, [state, loadTickets]);

  // Ticket ages ("4 min") tick along without refetching.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  async function toggleSound() {
    const next = !soundOn;
    if (next) await unlockSound();
    setSoundOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      // not persisted — fine
    }
  }

  async function markReady(orderId: string) {
    setError(null);
    setTickets((prev) => prev.filter((ticket) => ticket.orderId !== orderId));
    const res = await fetch(`/api/orders/${orderId}/ready`, { method: "PATCH" });
    if (redirectToLoginIfUnauthorized(res)) return;
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? t("err.readyFailed"));
      void loadTickets();
    }
  }

  async function toggleSoldOut(itemId: string, soldOut: boolean) {
    setError(null);
    setMenus((prev) =>
      prev.map((menu) => ({
        ...menu,
        categories: menu.categories.map((category) => ({
          ...category,
          items: category.items.map((item) => (item.id === itemId ? { ...item, isAvailable: !soldOut } : item)),
        })),
      }))
    );
    const res = await fetch(`/api/menu/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !soldOut }),
    });
    if (redirectToLoginIfUnauthorized(res)) return;
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? t("err.saveFailed"));
      void loadMenus();
    }
  }

  const myCategoryIds = useMemo(() => new Set(scope?.categories.map((c) => c.id) ?? []), [scope]);
  const soldOutGroups = useMemo(
    () =>
      menus.flatMap((menu) =>
        menu.categories
          .filter((category) => scope?.all || myCategoryIds.has(category.id))
          .filter((category) => category.items.length > 0)
          .map((category) => ({ category, menu }))
      ),
    [menus, scope, myCategoryIds]
  );

  const title = useMemo(() => {
    if (!scope || scope.all) return t("kitchen.allTitle");
    const menuNames = new Set(scope.categories.map((c) => c.menuName));
    if (menuNames.size === 1) {
      const first = scope.categories[0];
      return t("kitchen.menuTitle", { name: localName(lang, first.menuName, first.menuNameGu) });
    }
    return t("kitchen.title");
  }, [scope, t, lang]);

  const ageMinutes = (createdAt: string) => Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
  const showSoldOutPanel = soldOutGroups.length > 0;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-muted">
      <header className="bg-stone-900 text-white">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-5 gap-y-3 px-[clamp(16px,3vw,32px)] py-3.5">
          {role === "ADMIN" ? (
            <Link href="/" aria-label={t("nav.home")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-600 text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
              </svg>
            </Link>
          ) : null}
          <div className="flex min-w-0 flex-grow flex-col gap-0.5">
            <span className="text-xs font-bold tracking-wide text-orange-300">
              {t("kitchen.eyebrow")}
              {restaurantName ? ` · ${restaurantName}` : ""}
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] text-stone-300">{t("kitchen.showing")}</span>
            {scope?.all ? (
              <Chip>{t("kitchen.allCategories")}</Chip>
            ) : scope && scope.categories.length > 0 ? (
              scope.categories.map((category) => <Chip key={category.id}>{localName(lang, category.name, category.nameGu)}</Chip>)
            ) : (
              <Chip>—</Chip>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RealtimeStatus state={state} tone="dark" />
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${soundOn ? "border-orange-300 text-orange-200" : "border-stone-600 text-stone-300"}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                {soundOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m22 9-6 6M16 9l6 6" />}
              </svg>
              {soundOn ? t("kitchen.soundOn") : t("kitchen.soundOff")}
            </button>
            <LanguageToggle />
            <AccountMenu name={staffName} role={role} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-[18px] px-[clamp(16px,3vw,32px)] pb-10 pt-5">
        <div className="flex items-start gap-2.5 rounded-[14px] border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-stone-700">
          <svg className="mt-0.5 shrink-0 text-brand" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M16 3h5v5M8 3H3v5M12 22v-8.3a4 4 0 0 0-1.17-2.83L3 3M15 9l6-6" />
          </svg>
          <span>{scope && !scope.all && scope.categories.length === 0 ? t("kitchen.noCategories") : scope?.all ? t("kitchen.infoAll") : t("kitchen.infoMine")}</span>
        </div>

        {error ? (
          <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-start gap-6">
          <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
            <h2 className="text-lg font-extrabold">
              {t("kitchen.toCook")} <span className="font-semibold text-text-muted">· {tickets.length}</span>
            </h2>

            {loading ? (
              <LoadingState />
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-1 rounded-[18px] border border-dashed border-stone-300 bg-surface px-6 py-14 text-center">
                <p className="text-lg font-bold">{t("kitchen.empty")}</p>
                <p className="text-sm text-text-muted">{t("kitchen.emptyHint")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
                {tickets.map((ticket) => {
                  const age = ageMinutes(ticket.createdAt);
                  const late = age >= LATE_AFTER_MINUTES;
                  return (
                    <article key={ticket.orderId} className={`flex flex-col gap-3 rounded-[18px] border-2 bg-surface p-4 ${late ? "border-danger" : "border-border"}`}>
                      <div className="flex items-start justify-between gap-2.5 border-b border-border pb-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[32px] font-extrabold leading-none tracking-tight text-brand">
                            {ticket.seatCode ?? `#${ticket.tokenNumber}`}
                          </span>
                          <span className="text-[13px] font-semibold text-text-muted">
                            {ticket.seatCode ? t("kitchen.dineIn", { n: ticket.tokenNumber }) : t("kitchen.parcel", { n: ticket.tokenNumber })}
                            {ticket.customerName ? ` · ${ticket.customerName}` : ""}
                          </span>
                        </div>
                        <span className={`rounded-full px-2.5 py-1.5 text-[13px] font-extrabold ${late ? "bg-danger-light text-red-800" : "bg-surface-muted text-stone-700"}`}>
                          {age === 0 ? t("kitchen.justNow") : t("kitchen.minutes", { n: age })}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1.5">
                        {ticket.items.map((item, index) => (
                          <li key={`${item.menuItemId}-${index}`} className="flex justify-between gap-2.5 text-lg font-bold">
                            <span>{localName(lang, item.nameSnapshot, item.nameGuSnapshot)}</span>
                            <span className="shrink-0">× {item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      {ticket.note ? (
                        <div className="rounded-[10px] bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900">{t("kitchen.note", { note: ticket.note })}</div>
                      ) : null}
                      {ticket.otherPendingCount > 0 ? (
                        <span className="text-[13px] text-text-muted">{t("kitchen.otherScreens", { n: ticket.otherPendingCount })}</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => markReady(ticket.orderId)}
                        className="mt-auto flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-success-light text-base font-extrabold text-green-800 active:brightness-95"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        {t("kitchen.markReady")}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {showSoldOutPanel ? (
            <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-3 rounded-[18px] border border-border bg-surface p-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-base font-extrabold">{t("kitchen.soldOutTitle")}</h2>
                <span className="text-[13px] text-text-muted">{t("kitchen.soldOutHint")}</span>
              </div>
              {soldOutGroups.map(({ category, menu }) => (
                <div key={category.id} className="flex flex-col">
                  <span className="pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                    {menus.length > 1 ? `${localName(lang, menu.name, menu.nameGu)} · ` : ""}
                    {localName(lang, category.name, category.nameGu)}
                  </span>
                  {category.items.map((item) => (
                    <label key={item.id} className="flex min-h-11 items-center justify-between gap-2.5 border-b border-stone-100 px-1 text-[15px] font-semibold">
                      <span className={item.isAvailable ? "" : "text-danger line-through decoration-2"}>{localName(lang, item.name, item.nameGu)}</span>
                      <input
                        type="checkbox"
                        checked={!item.isAvailable}
                        onChange={(e) => toggleSoldOut(item.id, e.target.checked)}
                        className="h-[22px] w-[22px] accent-[#c2410c]"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-stone-700 bg-stone-800 px-2.5 py-1.5 text-[13px] font-semibold">{children}</span>;
}
