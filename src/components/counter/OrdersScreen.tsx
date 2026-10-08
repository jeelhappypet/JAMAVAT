"use client";

import { useState } from "react";
import Link from "next/link";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCounterData } from "@/components/counter/useCounterData";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { OrderDTO } from "@/types";

type Filter = "all" | "dineIn" | "parcel";

/** Counter "Orders" tab: every running order (parcel and dine-in) with Served / Cancel. */
export function OrdersScreen() {
  const { t, lang } = useI18n();
  const { orders, loading, error, busyIds, act } = useCounterData();
  const [cancelling, setCancelling] = useState<OrderDTO | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const running = orders.filter((order) => (filter === "all" ? true : filter === "dineIn" ? !!order.seatCode : !order.seatCode));
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(lang === "gu" ? "gu-IN" : "en-IN", { hour: "numeric", minute: "2-digit" });
  const itemName = (item: OrderDTO["items"][number]) => localName(lang, item.nameSnapshot, item.nameGuSnapshot);

  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: t("counter.filterAll"), n: orders.length },
    { id: "dineIn", label: t("counter.filterDineIn"), n: orders.filter((order) => order.seatCode).length },
    { id: "parcel", label: t("counter.filterParcel"), n: orders.filter((order) => !order.seatCode).length },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t("counter.running")}</h1>
        <Link href="/new-order" className="flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white active:bg-brand-dark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("counter.newParcel")}
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 self-start rounded-xl bg-stone-200 p-1">
        {filters.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => setFilter(option.id)}
            className={`h-[38px] rounded-[9px] px-3.5 text-sm ${filter === option.id ? "bg-surface font-bold text-foreground" : "font-semibold text-stone-700"}`}
          >
            {option.label} <span className="text-text-muted">· {option.n}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
          {error}
        </div>
      ) : null}

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
                      {clock(order.createdAt)}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${allReady ? "bg-success-light text-green-800" : readyCount > 0 ? "bg-orange-100 text-brand-dark" : "bg-surface-muted text-stone-700"}`}
                  >
                    {allReady ? t("counter.readyToServe") : readyCount > 0 ? t("counter.statusPart", { n: readyCount, total: order.items.length }) : t("counter.statusCooking")}
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
                {order.note ? (
                  <div className="rounded-[10px] bg-orange-50 px-3 py-2 text-[13px] text-orange-900">
                    <strong>{t("counter.note")}</strong> {order.note}
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-dashed border-border pt-2.5 text-base font-extrabold">
                  <span>{t("counter.total")}</span>
                  <span>₹{order.totalAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setCancelling(order)}
                    className="h-11 flex-1 rounded-xl border border-red-200 bg-surface text-sm font-bold text-danger disabled:opacity-50"
                  >
                    {t("counter.cancelOrder")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(order.id, `/api/orders/${order.id}/complete`)}
                    className="h-11 flex-[2] rounded-xl bg-success text-sm font-extrabold text-white disabled:opacity-50"
                  >
                    {t("counter.complete")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={cancelling !== null}
        title={cancelling ? t("counter.cancelTitle", { n: cancelling.tokenNumber }) : ""}
        description={cancelling?.seatCode ? t("counter.cancelSeatDesc") : t("counter.cancelDesc")}
        confirmLabel={t("counter.cancelOrder")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={() => {
          const order = cancelling;
          setCancelling(null);
          if (order) void act(order.id, `/api/orders/${order.id}/cancel`);
        }}
        onCancel={() => setCancelling(null)}
      />
    </>
  );
}
