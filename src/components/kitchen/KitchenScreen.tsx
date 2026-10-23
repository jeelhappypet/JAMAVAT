"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { AccountMenu, logoutThisDevice } from "@/components/shell/AccountMenu";
import { useAppPath } from "@/components/shell/RestaurantProvider";
import { SoldOutList, withSoldOut } from "@/components/menu/SoldOutList";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useArrivals } from "@/components/orders/useArrivals";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { POLL_MS, SAFETY_RESYNC_MS } from "@/lib/realtime/polling";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import { alertNewOrders } from "@/lib/utils/orderNotification";
import { KITCHEN_SOUND, useSoundPref, useUnlockAlertsOnFirstTap } from "@/lib/utils/soundPref";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { KitchenScopeDTO, KitchenTicketDTO, MenuDTO, StaffRole } from "@/types";

interface KitchenScreenProps {
  staffName: string;
  role: StaffRole;
  /**
   * The tickets the page already rendered. A kitchen login lands here
   * straight after its PIN, and asking for them again from the browser put a
   * skeleton and another round trip between the cook and the screen.
   */
  initialTickets?: KitchenTicketDTO[];
  initialScope?: KitchenScopeDTO;
}

const LATE_AFTER_MINUTES = 12;

/** The Kitchen artboard: only this login's categories, one ticket per order, sold-out switches on the side. */
export function KitchenScreen({ staffName, role, initialTickets, initialScope }: KitchenScreenProps) {
  const path = useAppPath();
  const { t, lang } = useI18n();
  const [tickets, setTickets] = useState<KitchenTicketDTO[]>(initialTickets ?? []);
  // A cook is at the pass, not watching the screen — a ticket that simply
  // appears is one that gets missed. The chime already plays; this is the
  // same news for anyone who glances up a second later.
  const arrived = useArrivals(tickets.map((ticket) => ticket.orderId));
  const [scope, setScope] = useState<KitchenScopeDTO | null>(initialScope ?? null);
  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(!initialTickets);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loggingOut, setLoggingOut] = useState(false);
  const [soundOn, toggleSound] = useSoundPref(KITCHEN_SOUND);
  // Seeded from the page's copy, so the next refresh only chimes for tickets
  // that arrived after the screen opened.
  const knownIds = useRef<Set<string> | null>(initialTickets ? new Set(initialTickets.map((ticket) => ticket.orderId)) : null);
  /** True until the mount effect has decided not to refetch what the page already sent. */
  const seeded = useRef(Boolean(initialTickets));
  const soundRef = useRef(soundOn);
  useUnlockAlertsOnFirstTap();

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/pending");
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      const next: KitchenTicketDTO[] = data.tickets;
      // Chime + notify only for tickets this screen hasn't seen before (not on first load).
      if (knownIds.current) {
        const seen = knownIds.current;
        const fresh = next.filter((ticket) => !seen.has(ticket.orderId)).map((ticket) => ({ ...ticket, id: ticket.orderId }));
        alertNewOrders(fresh, { t, lang, sound: soundRef.current });
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
  }, [t, lang]);

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
    if (seeded.current) {
      // The page handed over the tickets; only the sold-out list is missing.
      seeded.current = false;
      void loadMenus();
      return;
    }
    resync();
  }, [resync, loadMenus]);

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const { state } = useRealtime(
    {
      [REALTIME_EVENTS.ORDER_CREATED]: loadTickets,
      [REALTIME_EVENTS.ORDER_ITEMS_READY]: loadTickets,
      [REALTIME_EVENTS.ORDER_READY]: loadTickets,
      [REALTIME_EVENTS.ORDER_CANCELLED]: loadTickets,
      [REALTIME_EVENTS.ORDER_COMPLETED]: loadTickets,
      [REALTIME_EVENTS.MENU_UPDATED]: loadMenus,
      [REALTIME_EVENTS.ROUTING_UPDATED]: resync,
    },
    resync
  );

  usePeriodicRefresh(loadTickets, state === "connected" ? SAFETY_RESYNC_MS : POLL_MS);

  // Ticket ages ("4 min") tick along without refetching.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

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
    setMenus((prev) => withSoldOut(prev, itemId, soldOut));
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
      <header className="site-ink text-white">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-5 gap-y-3 px-[clamp(16px,3vw,32px)] py-3.5">
          <div className="flex min-w-0 flex-grow flex-col gap-0.5">
            <span className="text-xs font-bold tracking-wide text-brand-strong">{t("kitchen.eyebrow")}</span>
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] text-white/65">{t("kitchen.showing")}</span>
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
            <AccountMenu
              name={staffName}
              role={role}
              variant="plain"
              sound={{ on: soundOn, toggle: toggleSound }}
              links={role === "ADMIN" ? [{ href: "/today", label: "account.openAdmin" }, { href: "/counter", label: "account.openCounter" }] : []}
            />
            <Button
              variant="outlineDark"
              size="sm"
              disabled={loggingOut}
              onClick={() => {
                setLoggingOut(true);
                void logoutThisDevice(path("/login"));
              }}
            >
              {loggingOut ? t("account.loggingOut") : t("account.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-[18px] px-[clamp(16px,3vw,32px)] pb-10 pt-5">
        <div className="flex items-start gap-2.5 rounded-[14px] border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text-muted">
          <svg className="mt-0.5 shrink-0 text-brand" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M16 3h5v5M8 3H3v5M12 22v-8.3a4 4 0 0 0-1.17-2.83L3 3M15 9l6-6" />
          </svg>
          <span>{scope && !scope.all && scope.categories.length === 0 ? t("kitchen.noCategories") : scope?.all ? t("kitchen.infoAll") : t("kitchen.infoMine")}</span>
        </div>

        {error ? <Alert>{error}</Alert> : null}

        <div className="flex flex-wrap items-start gap-6">
          <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
            <h2 className="text-lg font-extrabold">
              {t("kitchen.toCook")} <span className="font-semibold text-text-muted">· {tickets.length}</span>
            </h2>

            {loading ? (
              <SkeletonCards count={4} minWidth={260} />
            ) : tickets.length === 0 ? (
              <EmptyState title={t("kitchen.empty")} hint={t("kitchen.emptyHint")} />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(236px,1fr))] gap-3">
                {tickets.map((ticket) => {
                  const age = ageMinutes(ticket.createdAt);
                  const late = age >= LATE_AFTER_MINUTES;
                  return (
                    <article
                      key={ticket.orderId}
                      className={`flex flex-col gap-3 rounded-[18px] border-2 bg-surface p-4 ${late ? "border-danger" : "border-border"} ${arrived.has(ticket.orderId) ? "motion-safe:animate-line-in" : ""}`}
                    >
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
                        <span className={`rounded-full px-2.5 py-1.5 text-[13px] font-extrabold ${late ? "bg-danger-light text-danger" : "bg-surface-muted text-text-muted"}`}>
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
                        <div className="rounded-[10px] bg-brand-light px-3 py-2 text-sm font-semibold text-brand-dark">{t("kitchen.note", { note: ticket.note })}</div>
                      ) : null}
                      {ticket.otherPendingCount > 0 ? (
                        <span className="text-[13px] text-text-muted">
                          {ticket.otherPendingCount === 1 ? t("kitchen.otherScreensOne") : t("kitchen.otherScreens", { n: ticket.otherPendingCount })}
                        </span>
                      ) : null}
                      <Button
                        variant="successSoft"
                        size="xl"
                        fullWidth
                        className="mt-auto"
                        onClick={() => markReady(ticket.orderId)}
                        icon={
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        }
                      >
                        {t("kitchen.markReady")}
                      </Button>
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
              <SoldOutList groups={soldOutGroups} showMenuName={menus.length > 1} onToggle={toggleSoldOut} />
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 text-[13px] font-semibold">{children}</span>;
}
