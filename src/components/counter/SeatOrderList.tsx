"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName, type MessageKey } from "@/lib/i18n/messages";
import { formatClock } from "@/lib/utils/time";
import { useAppPath } from "@/components/shell/RestaurantProvider";
import type { OrderDTO } from "@/types";

const STATUS: Record<OrderDTO["status"], { label: MessageKey; tone: "orange" | "green" | "red" }> = {
  PENDING: { label: "seatBill.statusCooking", tone: "orange" },
  READY: { label: "seatBill.statusReady", tone: "green" },
  COMPLETED: { label: "seatBill.statusReady", tone: "green" },
  CANCELLED: { label: "seatBill.statusCancelled", tone: "red" },
};

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * Everything this table has ordered this sitting, newest order last, with a
 * way to add more.
 *
 * The kitchen column comes from `SeatDetailDTO.kitchens` — a small map the
 * seat endpoint already returns — never from fetching the menu tree.
 */
export function SeatOrderList({ seatId, orders, kitchenOf }: { seatId: string; orders: OrderDTO[]; kitchenOf: (categoryId?: string) => string | undefined }) {
  const path = useAppPath();
  const { t, lang } = useI18n();

  return (
    <section className="flex min-w-0 flex-[999_1_540px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-[17px] font-extrabold">{t("seatBill.ordersTitle")}</h2>
        <Button
          href={path(`/new-order?seat=${seatId}`)}
          variant="secondary"
          size="sm"
          icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        >
          {t("seatBill.addItem")}
        </Button>
      </div>

      {orders.map((order) => {
        const cancelled = order.status === "CANCELLED";
        return (
          <article key={order.id} className={cn("overflow-hidden rounded-[16px] border border-border bg-surface", cancelled && "opacity-70")}>
            <div className="flex items-center justify-between gap-2.5 border-b border-border bg-surface-muted px-3.5 py-2.5">
              <span className="text-sm font-extrabold">
                {t("seatBill.orderNo", { n: order.tokenNumber })}{" "}
                <span className="font-semibold text-text-muted">
                  · {formatClock(order.createdAt, lang)} · {order.source === "QR" ? t("seatBill.sourceQr") : t("seatBill.sourceCounter")}
                </span>
              </span>
              <Badge tone={STATUS[order.status].tone}>{t(STATUS[order.status].label)}</Badge>
            </div>

            {/* A list, not a table. The table needed a 460px minimum and a
                sideways scrollbar inside the card on any phone; these are four
                short fields per line and they fit without one. */}
            <ul className="flex list-none flex-col p-0">
              {order.items.map((item, index) => (
                <li
                  key={`${item.menuItemId}-${index}`}
                  className={cn("flex items-baseline gap-2.5 px-3.5 py-2 text-[15px]", index > 0 && "border-t border-border/60")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{localName(lang, item.nameSnapshot, item.nameGuSnapshot)}</span>
                    <span className="text-[12px] text-text-muted">{kitchenOf(item.categoryId) ?? item.kitchenSnapshot ?? item.categorySnapshot}</span>
                  </span>
                  <span className="shrink-0 text-sm text-text-muted tabular-nums">× {item.quantity}</span>
                  <span className={cn("w-[62px] shrink-0 text-right font-bold tabular-nums", cancelled && "line-through")}>{rupees(item.lineTotal)}</span>
                </li>
              ))}
            </ul>

            {order.note ? (
              <p className="border-t border-border/60 bg-brand-light/50 px-3.5 py-2 text-[13px] text-brand-dark">
                <strong>{t("counter.note")}</strong> {order.note}
              </p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
