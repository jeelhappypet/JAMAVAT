"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { POLL_MS, SAFETY_RESYNC_MS } from "@/lib/orders/useActiveOrders";
import { playNewOrderBeep, unlockSound } from "@/lib/utils/beep";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { OrderDTO, SeatDTO, TableDTO } from "@/types";

type Pending = { kind: "reject"; order: OrderDTO } | { kind: "cancel"; order: OrderDTO } | { kind: "free"; seat: SeatDTO };

const SOUND_KEY = "jamavat:counter-sound";

/** The counter's working screen: accept QR orders, serve and close running ones, free QRs. */
export function CounterScreen() {
  const { t, lang } = useI18n();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [soundOn, setSoundOn] = useState(false);
  const knownPlaced = useRef<Set<string> | null>(null);
  const soundRef = useRef(false);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/live");
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      const next: OrderDTO[] = data.orders;
      const placed = next.filter((order) => order.status === "PLACED").map((order) => order.id);
      if (knownPlaced.current && soundRef.current && placed.some((id) => !knownPlaced.current!.has(id))) playNewOrderBeep();
      knownPlaced.current = new Set(placed);
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

  const resync = useCallback(() => {
    void loadOrders();
    void loadTables();
  }, [loadOrders, loadTables]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    resync();
    try {
      if (localStorage.getItem(SOUND_KEY) === "on") setSoundOn(true);
    } catch {
      // storage blocked — sound starts off
    }
  }, [resync]);

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const { state } = useRealtime(
    {
      [REALTIME_EVENTS.ORDER_PLACED]: resync,
      [REALTIME_EVENTS.ORDER_ACCEPTED]: loadOrders,
      [REALTIME_EVENTS.ORDER_REJECTED]: resync,
      [REALTIME_EVENTS.ORDER_CREATED]: loadOrders,
      [REALTIME_EVENTS.ORDER_ITEMS_READY]: loadOrders,
      [REALTIME_EVENTS.ORDER_READY]: loadOrders,
      [REALTIME_EVENTS.ORDER_COMPLETED]: resync,
      [REALTIME_EVENTS.ORDER_CANCELLED]: resync,
      [REALTIME_EVENTS.SEAT_UPDATED]: loadTables,
    },
    resync
  );

  useEffect(() => {
    const interval = setInterval(resync, state === "connected" ? SAFETY_RESYNC_MS : POLL_MS);
    return () => clearInterval(interval);
  }, [state, resync]);

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
      // not persisted
    }
  }

  async function act(id: string, url: string, method = "PATCH") {
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
  }

  async function confirmPending() {
    if (!pending) return;
    const action = pending;
    setPending(null);
    if (action.kind === "reject") await act(action.order.id, `/api/orders/${action.order.id}/reject`);
    if (action.kind === "cancel") await act(action.order.id, `/api/orders/${action.order.id}/cancel`);
    if (action.kind === "free") await act(action.seat.id, `/api/seats/${action.seat.id}/free`, "POST");
  }

  const placed = orders.filter((order) => order.status === "PLACED");
  const running = orders.filter((order) => order.status === "PENDING" || order.status === "READY");
  const seatsInUse = useMemo(() => tables.flatMap((table) => table.seats.filter((seat) => seat.session)), [tables]);

  const ago = (iso: string) => {
    const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
    return minutes === 0 ? t("counter.justNow") : t("counter.minutesAgo", { n: minutes });
  };
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(lang === "gu" ? "gu-IN" : "en-IN", { hour: "numeric", minute: "2-digit" });
  const itemName = (item: OrderDTO["items"][number]) => localName(lang, item.nameSnapshot, item.nameGuSnapshot);

  const confirmCopy = pending
    ? pending.kind === "reject"
      ? { title: t("counter.rejectTitle", { code: pending.order.seatCode ?? `#${pending.order.tokenNumber}` }), description: t("counter.rejectDesc"), confirmLabel: t("counter.reject") }
      : pending.kind === "cancel"
        ? { title: t("counter.cancelTitle", { n: pending.order.tokenNumber }), description: t("counter.cancelDesc"), confirmLabel: t("counter.cancelOrder") }
        : { title: t("counter.freeTitle", { code: pending.seat.code }), description: t("counter.freeDesc"), confirmLabel: t("counter.freeQr") }
    : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t("counter.title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <RealtimeStatus state={state} />
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${soundOn ? "border-brand text-brand-dark" : "border-stone-300 text-stone-700"} bg-surface`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              {soundOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m22 9-6 6M16 9l6 6" />}
            </svg>
            {soundOn ? t("kitchen.soundOn") : t("kitchen.soundOff")}
          </button>
          <Link href="/new-order" className="flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white active:bg-brand-dark">
            + {t("counter.newParcel")}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Stat label={t("counter.newQr")} value={placed.length} highlight={placed.length > 0} />
        <Stat label={t("counter.running")} value={running.length} />
        <Stat label={t("counter.qrInUse")} value={seatsInUse.length} />
      </div>

      {error ? (
        <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-6">
        <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
          <h2 className="text-lg font-extrabold">
            {t("counter.running")} <span className="font-semibold text-text-muted">· {running.length}</span>
          </h2>
          {loading ? (
            <LoadingState />
          ) : running.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-stone-300 bg-surface px-6 py-12 text-center text-[15px] text-text-muted">{t("counter.noRunning")}</div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3">
              {running.map((order) => {
                const readyCount = order.items.filter((item) => item.status === "READY").length;
                const allReady = order.status === "READY";
                const busy = busyIds.has(order.id);
                return (
                  <article key={order.id} className={`flex flex-col gap-3 rounded-[18px] border-2 bg-surface p-4 ${allReady ? "border-green-600" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[28px] font-extrabold leading-none tracking-tight text-brand">{order.seatCode ?? `#${order.tokenNumber}`}</span>
                        <span className="text-[13px] font-semibold text-text-muted">
                          {order.seatCode ? t("counter.dineIn", { code: order.seatCode, n: order.tokenNumber }) : t("counter.parcel", { n: order.tokenNumber })}
                          {" · "}
                          {clock(order.acceptedAt ?? order.createdAt)}
                        </span>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${allReady ? "bg-success-light text-green-800" : readyCount > 0 ? "bg-orange-100 text-brand-dark" : "bg-surface-muted text-stone-700"}`}>
                        {allReady ? t("counter.statusReady") : readyCount > 0 ? t("counter.statusPart", { n: readyCount, total: order.items.length }) : t("counter.statusCooking")}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {order.items.map((item, index) => (
                        <li key={`${item.menuItemId}-${index}`} className="flex items-center justify-between gap-2 text-[15px]">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.status === "READY" ? "bg-green-600" : "bg-amber-500"}`} aria-hidden />
                            <span className="truncate font-semibold">{itemName(item)}</span>
                          </span>
                          <span className="shrink-0 text-text-muted">× {item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    {order.note ? <div className="rounded-[10px] bg-orange-50 px-3 py-2 text-[13px] text-orange-900"><strong>{t("counter.note")}</strong> {order.note}</div> : null}
                    <div className="flex items-center justify-between border-t border-dashed border-border pt-2.5 text-base font-extrabold">
                      <span>{t("counter.total")}</span>
                      <span>₹{order.totalAmount}</span>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={busy} onClick={() => setPending({ kind: "cancel", order })} className="h-11 flex-1 rounded-xl border border-red-200 bg-surface text-sm font-bold text-danger disabled:opacity-50">
                        {t("counter.cancelOrder")}
                      </button>
                      <button type="button" disabled={busy} onClick={() => act(order.id, `/api/orders/${order.id}/complete`)} className="h-11 flex-[2] rounded-xl bg-success text-sm font-extrabold text-white disabled:opacity-50">
                        {t("counter.complete")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* On phones the orders waiting for Accept/Reject come first — they need action. */}
        <aside className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 max-lg:order-first">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{t("counter.newQr")}</h2>
            {placed.length > 0 ? (
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-2 text-sm font-extrabold text-white">{placed.length}</span>
            ) : null}
          </div>
          {placed.length === 0 && !loading ? (
            <div className="rounded-[18px] border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted">{t("counter.noNewQr")}</div>
          ) : null}
          {placed.map((order) => {
            const groups = order.items.reduce<Record<string, OrderDTO["items"]>>((acc, item) => {
              (acc[item.categorySnapshot] ??= []).push(item);
              return acc;
            }, {});
            const busy = busyIds.has(order.id);
            return (
              <article key={order.id} className="flex flex-col gap-3 rounded-[18px] border-2 border-brand bg-surface p-4">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[22px] font-extrabold">{order.seatCode}</span>
                    <span className="truncate text-[13px] text-text-muted">
                      {ago(order.createdAt)} · {order.guestEmail}
                    </span>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-light px-2 py-1 text-xs font-bold text-green-800">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    {t("counter.verified")}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 text-sm">
                  {Object.entries(groups).map(([category, items]) => (
                    <div key={category} className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-wide text-text-muted">{category}</span>
                      {items.map((item, index) => (
                        <div key={`${item.menuItemId}-${index}`} className="flex justify-between gap-2">
                          <span>{itemName(item)}</span>
                          <span>× {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {order.note ? <div className="rounded-[10px] bg-orange-50 px-3 py-2 text-[13px] text-orange-900"><strong>{t("counter.note")}</strong> {order.note}</div> : null}
                <div className="flex items-center justify-between border-t border-dashed border-border pt-2.5 text-base font-extrabold">
                  <span>{t("counter.total")}</span>
                  <span>₹{order.totalAmount}</span>
                </div>
                <div className="flex gap-2.5">
                  <button type="button" disabled={busy} onClick={() => setPending({ kind: "reject", order })} className="h-12 flex-1 rounded-xl border border-red-200 bg-surface text-[15px] font-bold text-danger disabled:opacity-50">
                    {t("counter.reject")}
                  </button>
                  <button type="button" disabled={busy} onClick={() => act(order.id, `/api/orders/${order.id}/accept`)} className="h-12 flex-[2] rounded-xl bg-success text-[15px] font-extrabold text-white disabled:opacity-50">
                    {t("counter.accept")}
                  </button>
                </div>
              </article>
            );
          })}

          <h2 className="mt-2 text-lg font-extrabold">{t("counter.qrInUse")}</h2>
          <div className="overflow-hidden rounded-[18px] border border-border bg-surface">
            {seatsInUse.length === 0 ? (
              <p className="px-4 py-5 text-center text-sm text-text-muted">{t("counter.noQrInUse")}</p>
            ) : (
              seatsInUse.map((seat) => (
                <div key={seat.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                  <span className="flex h-9 min-w-11 shrink-0 items-center justify-center rounded-[10px] bg-orange-100 px-1.5 text-sm font-extrabold text-brand-dark">{seat.code}</span>
                  <span className="flex min-w-0 flex-grow flex-col">
                    <span className="truncate text-sm font-bold">{seat.session!.email}</span>
                    <span className="text-xs text-text-muted">
                      {seat.session!.orderCount === 1
                        ? t("counter.qrSummaryOne", { total: seat.session!.total, time: clock(seat.session!.openedAt) })
                        : t("counter.qrSummary", { n: seat.session!.orderCount, total: seat.session!.total, time: clock(seat.session!.openedAt) })}
                    </span>
                  </span>
                  <button type="button" disabled={busyIds.has(seat.id)} onClick={() => setPending({ kind: "free", seat })} className="h-10 shrink-0 rounded-[10px] border border-stone-300 bg-surface px-3 text-sm font-bold disabled:opacity-50">
                    {t("counter.freeQr")}
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCopy !== null}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description}
        confirmLabel={confirmCopy?.confirmLabel}
        cancelLabel={t("common.cancel")}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex min-w-[140px] flex-1 flex-col gap-0.5 rounded-2xl border border-border bg-surface px-4 py-3.5">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className={`text-2xl font-extrabold ${highlight ? "text-brand" : ""}`}>{value}</span>
    </div>
  );
}
