"use client";

import { useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useCounterData } from "@/components/counter/useCounterData";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatClock } from "@/lib/utils/time";
import { localName } from "@/lib/i18n/messages";
import type { OrderDTO } from "@/types";

type Filter = "all" | "dineIn" | "parcel";

/**
 * Counter "Orders" tab: what the kitchens are cooking, and what they finished
 * in the last half hour (to call a parcel token or carry food to a table).
 * No "served" step — a table's orders close when its bill is settled.
 */
export function OrdersScreen() {
  const { t, lang } = useI18n();
  const { orders, loading, error, busyIds, act } = useCounterData();
  const [cancelling, setCancelling] = useState<OrderDTO | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const shown = orders.filter((order) => (filter === "all" ? true : filter === "dineIn" ? !!order.seatCode : !order.seatCode));
  const cooking = shown.filter((order) => order.status === "PENDING");
  const ready = shown.filter((order) => order.status !== "PENDING").sort((a, b) => (b.readyAt ?? "").localeCompare(a.readyAt ?? ""));
  const itemName = (item: OrderDTO["items"][number]) => localName(lang, item.nameSnapshot, item.nameGuSnapshot);

  const card = (order: OrderDTO) => {
    const done = order.items.filter((item) => item.status === "READY").length;
    const finished = order.status !== "PENDING";
    // A table's order can still be taken off the bill until it's settled; a finished parcel is paid and gone.
    const cancellable = order.status === "PENDING" || (order.status === "READY" && !!order.seatCode);
    return (
      <article key={order.id} className={`flex flex-col gap-3 rounded-[18px] border-2 bg-surface p-4 ${finished ? "border-green-600" : "border-border"}`}>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[28px] font-extrabold leading-none tracking-tight text-brand">{order.seatCode ?? `#${order.tokenNumber}`}</span>
            <span className="text-[13px] font-semibold text-text-muted">
              {order.seatCode ? t("counter.dineIn", { code: order.seatCode, n: order.tokenNumber }) : t("counter.parcel", { n: order.tokenNumber })} · {formatClock(order.createdAt, lang)}
            </span>
          </div>
          <Badge tone={finished ? "green" : done > 0 ? "orange" : "stone"}>
            {finished ? t("counter.statusDone", { time: formatClock(order.readyAt ?? order.createdAt, lang) }) : done > 0 ? t("counter.statusPart", { n: done, total: order.items.length }) : t("counter.statusCooking")}
          </Badge>
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
        {cancellable ? (
          <Button variant="danger" disabled={busyIds.has(order.id)} onClick={() => setCancelling(order)} fullWidth>
            {t("counter.cancelOrder")}
          </Button>
        ) : null}
      </article>
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t("counter.running")}</h1>
        <Button
          href="/new-order"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        >
          {t("counter.newParcel")}
        </Button>
      </div>

      <SegmentedControl
        label={t("counter.filterLabel")}
        value={filter}
        onChange={setFilter}
        className="self-start"
        options={[
          { value: "all", label: t("counter.filterAll"), count: orders.length },
          { value: "dineIn", label: t("counter.filterDineIn"), count: orders.filter((order) => order.seatCode).length },
          { value: "parcel", label: t("counter.filterParcel"), count: orders.filter((order) => !order.seatCode).length },
        ]}
      />

      {error ? <Alert>{error}</Alert> : null}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <h2 className="text-lg font-extrabold">
            {t("counter.cookingNow")} <span className="font-semibold text-text-muted">· {cooking.length}</span>
          </h2>
          {cooking.length === 0 ? <EmptyState title={t("counter.noRunning")} /> : <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3">{cooking.map(card)}</div>}

          {ready.length > 0 ? (
            <>
              <h2 className="mt-2 text-lg font-extrabold">
                {t("counter.recentlyReady")} <span className="font-semibold text-text-muted">· {ready.length}</span>
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3">{ready.map(card)}</div>
            </>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={cancelling !== null}
        title={cancelling ? t("counter.cancelTitle", { n: cancelling.tokenNumber }) : ""}
        description={cancelling?.seatCode ? t("counter.cancelSeatDesc") : t("counter.cancelDesc")}
        confirmLabel={t("counter.cancelOrder")}
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
