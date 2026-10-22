"use client";

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { useAppPath } from "@/components/shell/RestaurantProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { minutesSince } from "@/components/counter/useCounterData";
import type { SeatDTO } from "@/types";

/**
 * One QR seat on the counter's grid: free, someone eating, or an order that
 * has just come in.
 *
 * On brand tokens rather than Tailwind's own `orange-100` / `stone-300`,
 * which were a different orange from the logo's and did not follow the
 * palette when it changed. The three states have to read apart at a glance
 * from across a counter, so they differ in fill *and* border weight, not in
 * shade alone — the grid is also the one screen someone checks in a hurry.
 */
const STATE = {
  free: "border-border bg-surface text-foreground hover:border-brand hover:bg-brand-light/50",
  eating: "border-brand/45 bg-brand-light text-brand-dark",
  new: "border-brand bg-brand text-white",
} as const;

export const SEAT_SWATCH = {
  free: "border-[1.5px] border-border bg-surface",
  eating: "border-[1.5px] border-brand/45 bg-brand-light",
  new: "bg-brand",
} as const;

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export function SeatTile({ seat, now }: { seat: SeatDTO; now: number }) {
  const path = useAppPath();
  const { t } = useI18n();
  const session = seat.session;
  const base = "tap-tile flex min-h-[92px] flex-col justify-between gap-2 rounded-[14px] border-[1.5px] p-2.5";

  // Free: tap to take an order for it from the counter (no email code; its QR
  // then shows "in use" to anyone who scans it).
  if (!session) {
    return (
      <Link href={path(`/new-order?seat=${seat.id}`)} aria-label={t("counter.startOrder", { code: seat.code })} className={cn(base, STATE.free)}>
        <span className="text-[22px] font-extrabold tracking-tight">{seat.code}</span>
        <span className="text-[13px] font-semibold text-text-muted">{t("counter.free")}</span>
      </Link>
    );
  }

  return (
    <Link href={path(`/counter/seat/${seat.id}`)} aria-label={t("counter.openSeat", { code: seat.code })} className={cn(base, STATE[session.state])}>
      <span className="flex items-start justify-between gap-1">
        <span className="text-[22px] font-extrabold tracking-tight">{seat.code}</span>
        {session.state === "new" ? <span className="text-[11px] font-extrabold tracking-wide">{t("counter.tagNew")}</span> : null}
      </span>
      <span className="text-[13px] font-semibold tabular-nums">
        {rupees(session.total)} · {t("counter.minutes", { n: minutesSince(session.openedAt, now) })}
      </span>
    </Link>
  );
}
