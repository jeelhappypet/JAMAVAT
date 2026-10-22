"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Legend, StatCard } from "@/components/ui/StatCard";
import { SEAT_SWATCH, SeatTile } from "@/components/counter/SeatTile";
import { useArrivals } from "@/components/orders/useArrivals";
import { minutesSince, useCounterData } from "@/components/counter/useCounterData";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { OrderDTO, TableDTO } from "@/types";
import { useAppPath } from "@/components/shell/RestaurantProvider";

/** A seat shows up under "New QR orders" for this long after it was placed. */
const NEW_FOR_MINUTES = 5;

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * "Counter · seats & new QR orders". Orders go straight to the kitchens and
 * there's no "served" step: a seat stays taken until its bill is settled on
 * the seat page.
 *
 * It asks for tables and orders, and nothing else. It used to ask for the
 * menu tree as well — every dish, description and photo URL of every menu —
 * to turn a categoryId into the kitchen name on one card, and to do it again
 * on every MENU_UPDATED event. The kitchen is now snapshotted on the order
 * item itself (`kitchenSnapshot`), so that call is gone.
 */
export function SeatsScreen() {
  const path = useAppPath();
  const { t, lang } = useI18n();
  const { orders, tables, loading, error, now } = useCounterData({ tables: true });
  const arrived = useArrivals(orders.map((order) => order.id));

  const activeTables = useMemo(
    () =>
      tables
        .filter((table) => table.isActive)
        .map((table) => ({ ...table, seats: table.seats.filter((seat) => seat.isActive) }))
        .filter((table) => table.seats.length > 0),
    [tables]
  );

  const seats = activeTables.flatMap((table) => table.seats);
  const inUse = seats.filter((seat) => seat.session);
  const runningTotal = inUse.reduce((sum, seat) => sum + (seat.session?.total ?? 0), 0);
  const cooking = orders.filter((order) => order.status === "PENDING").length;
  const fresh = orders
    .filter((order) => order.source === "QR" && order.status === "PENDING" && minutesSince(order.createdAt, now) < NEW_FOR_MINUTES)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const areas = useMemo(() => {
    const groups = new Map<string, TableDTO[]>();
    for (const table of activeTables) groups.set(table.area ?? "", [...(groups.get(table.area ?? "") ?? []), table]);
    return [...groups.entries()].map(([name, list]) => ({ name, tables: list }));
  }, [activeTables]);

  const seatIdByCode = new Map(seats.map((seat) => [seat.code, seat.id]));
  const itemName = (item: OrderDTO["items"][number]) => localName(lang, item.nameSnapshot, item.nameGuSnapshot);
  // Orders placed before the kitchen was snapshotted fall back to the category.
  const kitchenOf = (item: OrderDTO["items"][number]) => item.kitchenSnapshot || item.categorySnapshot;

  return (
    <div className="flex flex-wrap items-start gap-5">
      <section className="flex min-w-0 flex-[999_1_620px] flex-col gap-4">
        <div className="flex flex-wrap gap-2.5">
          <StatCard label={t("counter.seatsInUse")} value={inUse.length} suffix={t("counter.ofQr", { n: seats.length })} />
          <StatCard label={t("counter.newQr")} value={fresh.length} tone={fresh.length > 0 ? "brand" : "plain"} />
          <StatCard label={t("counter.cookingNow")} value={cooking} />
          <StatCard label={t("counter.runningTotal")} value={rupees(runningTotal)} />
        </div>

        <div className="flex flex-wrap gap-3.5">
          <Legend swatch={SEAT_SWATCH.free} label={t("counter.legendFree")} />
          <Legend swatch={SEAT_SWATCH.eating} label={t("counter.legendEating")} />
          <Legend swatch={SEAT_SWATCH.new} label={t("counter.legendNew")} />
        </div>

        {error ? <Alert>{error}</Alert> : null}

        {loading ? (
          <SkeletonCards kind="table" count={6} minWidth={230} />
        ) : areas.length === 0 ? (
          <EmptyState title={t("counter.noTables")} />
        ) : (
          areas.map((area) => (
            <div key={area.name || "-"} className="flex flex-col gap-2.5">
              <h2 className="text-[15px] font-extrabold">
                {area.name || t("counter.tablesHeading")}{" "}
                <span className="font-semibold text-text-muted">
                  · {area.tables.length === 1 ? t("counter.tableCountOne") : t("counter.tableCount", { n: area.tables.length })}
                </span>
              </h2>
              {/* Narrower tracks than before: with a real floor plan the grid was
                  four tables wide on a 1440 laptop and left half the screen empty. */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-2.5">
                {area.tables.map((table) => (
                  <div key={table.id} className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-2.5">
                    <span className="px-0.5 text-[13px] font-bold text-text-muted">{t("tables.table", { name: table.name })}</span>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(table.seats.length, 2)}, minmax(0, 1fr))` }}>
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
      <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-3 max-lg:order-first">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold">{t("counter.newQr")}</h2>
          {fresh.length > 0 ? (
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-2 text-sm font-extrabold tabular-nums text-white">{fresh.length}</span>
          ) : null}
        </div>

        {fresh.length === 0 ? (
          <div className="rounded-[16px] border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted">{t("counter.noNewQr")}</div>
        ) : (
          fresh.map((order, index) => {
            const seatId = seatIdByCode.get(order.seatCode!);
            const href = path(seatId ? `/counter/seat/${seatId}` : "/counter/orders");
            const age = minutesSince(order.createdAt, now);
            const ago = age === 0 ? t("counter.justNow") : t("counter.minutesAgo", { n: age });

            // Only the newest one is opened out; the rest are one line each.
            if (index > 0) {
              return (
                <Link
                  key={order.id}
                  href={href}
                  className={`tap-tile flex items-start justify-between gap-2.5 rounded-[16px] border border-border bg-surface p-3.5 hover:border-brand ${arrived.has(order.id) ? "motion-safe:animate-line-in" : ""}`}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-lg font-extrabold">{order.seatCode}</span>
                    <span className="truncate text-[13px] text-text-muted">
                      {ago} · {order.items.map((item) => `${itemName(item)} × ${item.quantity}`).join(", ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-[15px] font-extrabold tabular-nums">{rupees(order.totalAmount)}</span>
                </Link>
              );
            }

            const groups = new Map<string, OrderDTO["items"]>();
            for (const item of order.items) groups.set(kitchenOf(item), [...(groups.get(kitchenOf(item)) ?? []), item]);

            return (
              <Link
                key={order.id}
                href={href}
                className={`tap-tile flex flex-col gap-2.5 rounded-[16px] border-2 border-brand bg-surface p-3.5 ${arrived.has(order.id) ? "motion-safe:animate-line-in" : ""}`}
              >
                <span className="flex items-start justify-between gap-2.5">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xl font-extrabold">{order.seatCode}</span>
                    <span className="truncate text-[13px] text-text-muted">{ago}</span>
                  </span>
                  {order.source === "QR" ? (
                    <Badge tone="green">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      {t("counter.verified")}
                    </Badge>
                  ) : null}
                </span>

                <span className="flex flex-col gap-1.5 text-sm">
                  {[...groups].map(([kitchen, items], groupIndex) => (
                    <span key={kitchen} className="flex flex-col gap-1">
                      <span className={`text-[11px] font-extrabold uppercase tracking-[0.08em] text-text-muted ${groupIndex > 0 ? "mt-1.5" : ""}`}>
                        {t("counter.kitchenLabel", { name: kitchen })}
                      </span>
                      {items.map((item, i) => (
                        <span key={`${item.menuItemId}-${i}`} className="flex justify-between gap-2">
                          <span>{itemName(item)}</span>
                          <span className="tabular-nums">× {item.quantity}</span>
                        </span>
                      ))}
                    </span>
                  ))}
                </span>

                {order.note ? (
                  <span className="rounded-[10px] bg-brand-light px-3 py-2 text-[13px] text-brand-dark">
                    <strong>{t("counter.note")}</strong> {order.note}
                  </span>
                ) : null}

                <span className="flex items-center justify-between border-t border-dashed border-border pt-2.5 text-[15px] font-extrabold">
                  <span>{t("counter.total")}</span>
                  <span className="tabular-nums">{rupees(order.totalAmount)}</span>
                </span>
                <span className="text-[13px] font-semibold text-text-muted">{t("counter.sentToKitchens")}</span>
              </Link>
            );
          })
        )}
      </aside>
    </div>
  );
}
