"use client";

import { useState } from "react";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { OrderTicket } from "@/components/orders/OrderTicket";
import { useArrivals } from "@/components/orders/useArrivals";
import { useCounterData } from "@/components/counter/useCounterData";
import { TablePickerDialog } from "@/components/counter/TablePickerDialog";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { OrderDTO } from "@/types";
import { useAppPath } from "@/components/shell/RestaurantProvider";

type Filter = "all" | "dineIn" | "parcel";

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(258px,1fr))] gap-3";

/**
 * Counter "Orders" tab: what the kitchens are cooking, and what they finished
 * in the last half hour (to call a parcel token or carry food to a table).
 * No "served" step — a table's orders close when its bill is settled.
 *
 * `useCounterData()` with no arguments on purpose: this screen needs the
 * running orders and nothing else, and every option on that hook is another
 * request.
 */
export function OrdersScreen({ initialOrders }: { initialOrders?: OrderDTO[] }) {
  const path = useAppPath();
  const { t } = useI18n();
  const { orders, loading, error, busyIds, act } = useCounterData({ initial: initialOrders ? { orders: initialOrders } : undefined });
  const [cancelling, setCancelling] = useState<OrderDTO | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [pickingTable, setPickingTable] = useState(false);
  const arrived = useArrivals(orders.map((order) => order.id));

  const shown = orders.filter((order) => (filter === "all" ? true : filter === "dineIn" ? !!order.seatCode : !order.seatCode));
  const cooking = shown.filter((order) => order.status === "PENDING");
  const ready = shown.filter((order) => order.status !== "PENDING").sort((a, b) => (b.readyAt ?? "").localeCompare(a.readyAt ?? ""));

  const ticket = (order: OrderDTO) => (
    <OrderTicket key={order.id} order={order} busy={busyIds.has(order.id)} onCancel={setCancelling} isNew={arrived.has(order.id)} />
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold tracking-tight">{t("counter.running")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPickingTable(true)}
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 10h18M5 10v9M19 10v9M8 6h8" />
              </svg>
            }
          >
            {t("counter.newTableOrder")}
          </Button>
          <Button
            href={path("/new-order")}
            size="sm"
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
          >
            {t("counter.newParcel")}
          </Button>
        </div>
      </div>

      <TablePickerDialog open={pickingTable} onClose={() => setPickingTable(false)} />

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
        <SkeletonCards count={3} minWidth={258} />
      ) : (
        <>
          <h2 className="text-base font-extrabold">
            {t("counter.cookingNow")} <span className="font-semibold text-text-muted tabular-nums">· {cooking.length}</span>
          </h2>
          {cooking.length === 0 ? <EmptyState title={t("counter.noRunning")} /> : <div className={GRID}>{cooking.map(ticket)}</div>}

          {ready.length > 0 ? (
            <>
              <h2 className="mt-1 text-base font-extrabold">
                {t("counter.recentlyReady")} <span className="font-semibold text-text-muted tabular-nums">· {ready.length}</span>
              </h2>
              <div className={GRID}>{ready.map(ticket)}</div>
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
