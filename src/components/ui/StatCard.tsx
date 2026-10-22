import type { ReactNode } from "react";
import { cn } from "./cn";

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Smaller text after the value — "/ 8 QR", "vs yesterday". */
  suffix?: ReactNode;
  /** Draws attention while the number is not zero: a waiting order, a table that needs a bill. */
  tone?: "plain" | "brand";
  className?: string;
}

/**
 * One figure in the row across the top of a staff screen — seats in use, new
 * orders, running total. It was a private `Stat` inside `SeatsScreen`; the
 * same row belongs on the orders and kitchen screens, so it lives here.
 *
 * `tabular-nums` because these numbers change every few seconds on a live
 * screen, and proportional digits make the row twitch sideways as they do.
 */
export function StatCard({ label, value, suffix, tone = "plain", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-[132px] flex-1 flex-col gap-0.5 rounded-2xl border px-4 py-3",
        tone === "brand" ? "border-brand/35 bg-brand-light" : "border-border bg-surface",
        className
      )}
    >
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className={cn("text-[22px] font-extrabold tabular-nums", tone === "brand" && "text-brand-dark")}>
        {value}
        {suffix ? <span className="ml-1 text-sm font-semibold text-text-muted">{suffix}</span> : null}
      </span>
    </div>
  );
}

/** The key under a seat grid: a colour swatch and what it means. */
export function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-text-muted">
      <span className={cn("h-3.5 w-3.5 rounded", swatch)} aria-hidden />
      {label}
    </span>
  );
}
