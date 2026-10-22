"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import { formatClock } from "@/lib/utils/time";
import type { OrderDTO } from "@/types";

interface OrderTicketProps {
  order: OrderDTO;
  busy: boolean;
  onCancel: (order: OrderDTO) => void;
  /** Came in since this screen was opened — it arrives with a movement. */
  isNew?: boolean;
}

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * One running order on the counter's Orders tab: what it is, what the
 * kitchens have finished, and the way to take it off the bill.
 *
 * Lifted out of `OrdersScreen`, where it was a 50-line function declared
 * inside the component — so it was rebuilt on every tick of the "12 min"
 * timer, and nothing else could use it.
 */
export function OrderTicket({ order, busy, onCancel, isNew = false }: OrderTicketProps) {
  const { t, lang } = useI18n();
  const done = order.items.filter((item) => item.status === "READY").length;
  const finished = order.status !== "PENDING";
  // A table's order can still be taken off the bill until it's settled; a
  // finished parcel is paid and gone.
  const cancellable = order.status === "PENDING" || (order.status === "READY" && !!order.seatCode);

  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-[16px] border-2 bg-surface p-3.5",
        finished ? "border-success/55" : "border-border",
        isNew && "motion-safe:animate-line-in"
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[26px] font-extrabold leading-none tracking-tight text-brand tabular-nums">{order.seatCode ?? `#${order.tokenNumber}`}</span>
          <span className="text-[13px] font-semibold text-text-muted">
            {order.seatCode ? t("counter.dineIn", { code: order.seatCode, n: order.tokenNumber }) : t("counter.parcel", { n: order.tokenNumber })} ·{" "}
            {formatClock(order.createdAt, lang)}
          </span>
        </div>
        <Badge tone={finished ? "green" : done > 0 ? "orange" : "stone"}>
          {finished
            ? t("counter.statusDone", { time: formatClock(order.readyAt ?? order.createdAt, lang) })
            : done > 0
              ? t("counter.statusPart", { n: done, total: order.items.length })
              : t("counter.statusCooking")}
        </Badge>
      </div>

      <ul className="flex list-none flex-col gap-1 p-0">
        {order.items.map((item, index) => (
          <li key={`${item.menuItemId}-${index}`} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {/* Per-item, because one order can be split across two kitchens
                  and only one of them may have finished. */}
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.status === "READY" ? "bg-success" : "bg-brand-strong")} aria-hidden />
              <span className="truncate font-semibold">{localName(lang, item.nameSnapshot, item.nameGuSnapshot)}</span>
            </span>
            <span className="shrink-0 text-text-muted tabular-nums">× {item.quantity}</span>
          </li>
        ))}
      </ul>

      {order.note ? (
        <p className="rounded-[10px] bg-brand-light px-3 py-2 text-[13px] text-brand-dark">
          <strong>{t("counter.note")}</strong> {order.note}
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-dashed border-border pt-2.5 text-[15px] font-extrabold">
        <span>{t("counter.total")}</span>
        <span className="tabular-nums">{rupees(order.totalAmount)}</span>
      </div>

      {cancellable ? (
        <Button variant="danger" size="sm" disabled={busy} onClick={() => onCancel(order)} fullWidth>
          {t("counter.cancelOrder")}
        </Button>
      ) : null}
    </article>
  );
}
