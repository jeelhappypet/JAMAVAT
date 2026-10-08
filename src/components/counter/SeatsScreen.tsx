"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { minutesSince, useCounterData } from "@/components/counter/useCounterData";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { OrderDTO, SeatDTO, TableDTO } from "@/types";

/** A seat shows up under "New QR orders" for this long after it was placed. */
const NEW_FOR_MINUTES = 5;

const TILE = {
  free: "bg-surface border-stone-300 text-foreground",
  eating: "bg-orange-100 border-orange-300 text-orange-900",
  new: "bg-brand border-brand text-white",
  ready: "bg-success-light border-green-300 text-green-900",
} as const;

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/** "Counter · seats & new QR orders" artboard. */
export function SeatsScreen() {
  const { t, lang } = useI18n();
  const data = useCounterData();
  const { orders, tables, loading, error, busyIds, now, act, kitchenByCategory } = data;

  const activeTables = useMemo(
    () => tables.filter((table) => table.isActive).map((table) => ({ ...table, seats: table.seats.filter((seat) => seat.isActive) })).filter((table) => table.seats.length > 0),
    [tables]
  );
  const seats = activeTables.flatMap((table) => table.seats);
  const inUse = seats.filter((seat) => seat.session);
  const runningTotal = inUse.reduce((sum, seat) => sum + (seat.session?.total ?? 0), 0);

  const seatOrders = orders.filter((order) => order.seatCode);
  const fresh = seatOrders
    .filter((order) => order.status === "PENDING" && minutesSince(order.createdAt, now) < NEW_FOR_MINUTES)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const toServe = orders.filter((order) => order.status === "READY" || (order.status === "PENDING" && order.items.some((item) => item.status === "READY")));
  const readyCount = orders.filter((order) => order.status === "READY").length;

  const areas = useMemo(() => {
    const groups = new Map<string, TableDTO[]>();
    for (const table of activeTables) {
      const key = table.area ?? "";
      groups.set(key, [...(groups.get(key) ?? []), table]);
    }
    return [...groups.entries()].map(([name, list]) => ({ name, tables: list }));
  }, [activeTables]);

  const seatIdByCode = new Map(seats.map((seat) => [seat.code, seat.id]));
  const itemName = (item: OrderDTO["items"][number]) => localName(lang, item.nameSnapshot, item.nameGuSnapshot);
  const summary = (order: OrderDTO) => order.items.map((item) => `${itemName(item)} × ${item.quantity}`).join(", ");

  /** "Gujarati part ready · Punjabi cooking" — per kitchen, from each item's menu. */
  const readiness = (order: OrderDTO) => {
    if (order.status === "READY") return t("counter.allReady");
    const byKitchen = new Map<string, boolean>();
    for (const item of order.items) {
      const kitchen = (item.categoryId && kitchenByCategory.get(item.categoryId)) || item.categorySnapshot;
      byKitchen.set(kitchen, (byKitchen.get(kitchen) ?? true) && item.status === "READY");
    }
    const ready = [...byKitchen].filter(([, done]) => done).map(([name]) => name);
    const cooking = [...byKitchen].filter(([, done]) => !done).map(([name]) => name);
    return [ready.length ? t("counter.partReady", { names: ready.join(", ") }) : "", cooking.length ? t("counter.partCooking", { names: cooking.join(", ") }) : ""]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-[18px]">
        <div className="flex flex-wrap gap-2.5">
          <Stat label={t("counter.seatsInUse")} value={String(inUse.length)} suffix={t("counter.ofQr", { n: seats.length })} />
          <Stat label={t("counter.newQr")} value={String(fresh.length)} />
          <Stat label={t("counter.readyToServe")} value={String(readyCount)} />
          <Stat label={t("counter.runningTotal")} value={rupees(runningTotal)} />
        </div>

        <div className="flex flex-wrap gap-3.5 text-[13px] text-stone-700">
          <Legend className="border-[1.5px] border-stone-300 bg-surface" label={t("counter.legendFree")} />
          <Legend className="border-[1.5px] border-orange-300 bg-orange-100" label={t("counter.legendEating")} />
          <Legend className="bg-brand" label={t("counter.legendNew")} />
          <Legend className="border-[1.5px] border-green-300 bg-success-light" label={t("counter.legendReady")} />
        </div>

        {error ? (
          <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
            {error}
          </div>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : areas.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-stone-300 bg-surface px-6 py-12 text-center text-[15px] text-text-muted">{t("counter.noTables")}</div>
        ) : (
          areas.map((area) => (
            <div key={area.name || "-"} className="flex flex-col gap-2.5">
              <h2 className="text-base font-extrabold">
                {area.name || t("counter.tablesHeading")}{" "}
                <span className="font-semibold text-text-muted">· {area.tables.length === 1 ? t("counter.tableCountOne") : t("counter.tableCount", { n: area.tables.length })}</span>
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
                {area.tables.map((table) => (
                  <div key={table.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2.5">
                    <span className="px-1 text-[13px] font-bold text-text-muted">{t("tables.table", { name: table.name })}</span>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${table.seats.length}, minmax(0, 1fr))` }}>
                      {table.seats.map((seat) => (
                        <SeatTile key={seat.id} seat={seat} now={now} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* On phones the new orders come first — they're what the counter is waiting for. */}
      <aside className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 max-lg:order-first">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t("counter.newQr")}</h2>
          {fresh.length > 0 ? <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-2 text-sm font-extrabold text-white">{fresh.length}</span> : null}
        </div>

        {fresh.length === 0 ? (
          <div className="rounded-[18px] border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted">{t("counter.noNewQr")}</div>
        ) : (
          fresh.map((order, index) => {
            const seatId = seatIdByCode.get(order.seatCode!);
            const href = seatId ? `/counter/seat/${seatId}` : "/counter/orders";
            const age = minutesSince(order.createdAt, now);
            const ago = age === 0 ? t("counter.justNow") : t("counter.minutesAgo", { n: age });
            if (index > 0) {
              return (
                <Link key={order.id} href={href} className="flex flex-col gap-2.5 rounded-[18px] border border-border bg-surface p-4">
                  <span className="flex items-start justify-between gap-2.5">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-xl font-extrabold">{order.seatCode}</span>
                      <span className="truncate text-[13px] text-text-muted">
                        {ago} · {summary(order)}
                      </span>
                    </span>
                    <span className="shrink-0 text-base font-extrabold">{rupees(order.totalAmount)}</span>
                  </span>
                </Link>
              );
            }
            const groups = new Map<string, OrderDTO["items"]>();
            for (const item of order.items) {
              const kitchen = (item.categoryId && kitchenByCategory.get(item.categoryId)) || item.categorySnapshot;
              groups.set(kitchen, [...(groups.get(kitchen) ?? []), item]);
            }
            return (
              <Link key={order.id} href={href} className="flex flex-col gap-3 rounded-[18px] border-2 border-brand bg-surface p-4">
                <span className="flex items-start justify-between gap-2.5">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[22px] font-extrabold">{order.seatCode}</span>
                    <span className="truncate text-[13px] text-text-muted">
                      {ago}
                      {order.guestEmail ? ` · ${order.guestEmail}` : ""}
                    </span>
                  </span>
                  {order.source === "QR" ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-light px-2 py-1 text-xs font-bold text-green-800">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      {t("counter.verified")}
                    </span>
                  ) : null}
                </span>
                <span className="flex flex-col gap-1.5 text-sm">
                  {[...groups].map(([kitchen, items], groupIndex) => (
                    <span key={kitchen} className="flex flex-col gap-1.5">
                      <span className={`text-xs font-bold uppercase text-text-muted ${groupIndex > 0 ? "mt-1.5" : ""}`}>{t("counter.kitchenLabel", { name: kitchen })}</span>
                      {items.map((item, i) => (
                        <span key={`${item.menuItemId}-${i}`} className="flex justify-between gap-2">
                          <span>{itemName(item)}</span>
                          <span>× {item.quantity}</span>
                        </span>
                      ))}
                    </span>
                  ))}
                </span>
                {order.note ? (
                  <span className="rounded-[10px] bg-orange-50 px-3 py-2 text-[13px] text-orange-900">
                    <strong>{t("counter.note")}</strong> {order.note}
                  </span>
                ) : null}
                <span className="flex items-center justify-between border-t border-dashed border-border pt-2.5 text-base font-extrabold">
                  <span>{t("counter.total")}</span>
                  <span>{rupees(order.totalAmount)}</span>
                </span>
                <span className="text-[13px] font-semibold text-text-muted">{t("counter.sentToKitchens")}</span>
              </Link>
            );
          })
        )}

        <h2 className="mt-2 text-lg font-extrabold">{t("counter.readyToServe")}</h2>
        <div className="overflow-hidden rounded-[18px] border border-border bg-surface">
          {toServe.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-text-muted">{t("counter.nothingToServe")}</p>
          ) : (
            toServe.map((order) => {
              const allReady = order.status === "READY";
              return (
                <div key={order.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                  <span
                    className={`flex h-9 min-w-11 shrink-0 items-center justify-center rounded-[10px] px-1.5 text-sm font-extrabold ${allReady ? "bg-success-light text-green-900" : "bg-orange-100 text-orange-900"}`}
                  >
                    {order.seatCode ?? `#${order.tokenNumber}`}
                  </span>
                  <span className="flex min-w-0 flex-grow flex-col">
                    <span className="truncate text-sm font-bold">{summary(order)}</span>
                    <span className="truncate text-xs text-text-muted">{readiness(order)}</span>
                  </span>
                  <button
                    type="button"
                    disabled={!allReady || busyIds.has(order.id)}
                    title={allReady ? undefined : t("counter.servedWhenReady")}
                    onClick={() => act(order.id, `/api/orders/${order.id}/complete`)}
                    className="h-10 shrink-0 rounded-[10px] border border-border bg-surface px-3.5 text-sm font-bold text-foreground disabled:opacity-50"
                  >
                    {t("counter.served")}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}

function SeatTile({ seat, now }: { seat: SeatDTO; now: number }) {
  const { t } = useI18n();
  const session = seat.session;
  if (!session) {
    return (
      <div className={`flex min-h-[78px] flex-col justify-between gap-2.5 rounded-xl border-[1.5px] p-2.5 ${TILE.free}`}>
        <span className="text-xl font-extrabold tracking-tight">{seat.code}</span>
        <span className="text-xs font-semibold">{t("counter.free")}</span>
      </div>
    );
  }
  const tag = session.state === "new" ? t("counter.tagNew") : session.state === "ready" ? t("counter.tagReady") : "";
  return (
    <Link
      href={`/counter/seat/${seat.id}`}
      aria-label={t("counter.openSeat", { code: seat.code })}
      className={`flex min-h-[78px] flex-col justify-between gap-2.5 rounded-xl border-[1.5px] p-2.5 ${TILE[session.state]}`}
    >
      <span className="flex items-start justify-between gap-1">
        <span className="text-xl font-extrabold tracking-tight">{seat.code}</span>
        {tag ? <span className="text-[10px] font-extrabold tracking-wide">{tag}</span> : null}
      </span>
      <span className="text-xs font-semibold">
        {rupees(session.total)} · {t("counter.minutes", { n: minutesSince(session.openedAt, now) })}
      </span>
    </Link>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="flex min-w-[140px] flex-1 flex-col gap-0.5 rounded-2xl border border-border bg-surface px-4 py-3.5">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className="text-2xl font-extrabold">
        {value} {suffix ? <span className="text-sm font-semibold text-text-muted">{suffix}</span> : null}
      </span>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3.5 w-3.5 rounded ${className}`} aria-hidden />
      {label}
    </span>
  );
}
