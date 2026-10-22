"use client";

import type { ReactNode } from "react";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { VegMark } from "@/components/orders/DishTile";
import { cn } from "@/components/ui/cn";

export interface CartLine {
  key: string;
  name: string;
  isVeg: boolean;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Set for the line that changed last — it flashes once, then stops. */
  justChanged?: boolean;
}

interface OrderCartProps {
  /** "Token 7", "Table 4A" — what this bill is for. */
  title: string;
  subtitle?: string;
  lines: CartLine[];
  total: number;
  count: number;
  countLabel: string;
  emptyText: string;
  onChange: (key: string, delta: 1 | -1) => void;
  decreaseLabel: string;
  increaseLabel: string;
  totalLabel: string;
  /** Payment mode picker, note field, anything between the lines and the action. */
  children?: ReactNode;
  /** The send control — `SwipeToSend`, or a button on a bill that is being added to. */
  action: ReactNode;
  className?: string;
}

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * The running bill beside the dish grid.
 *
 * Its own scroll area, with the header and the total pinned: on a long order
 * the total is the one number the counter is asked for out loud, and it must
 * never be the thing that has scrolled away.
 *
 * A line that has just changed flashes once. Without it, a second tap on a
 * dish already in the bill looks like nothing happened — the count ticks up a
 * pane away, outside where the finger is looking.
 */
export function OrderCart({
  title,
  subtitle,
  lines,
  total,
  count,
  countLabel,
  emptyText,
  onChange,
  decreaseLabel,
  increaseLabel,
  totalLabel,
  children,
  action,
  className,
}: OrderCartProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col rounded-[18px] border border-border bg-surface", className)}>
      <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-border px-4 py-3">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[17px] font-extrabold">{title}</span>
          {subtitle ? <span className="truncate text-[13px] text-text-muted">{subtitle}</span> : null}
        </span>
        <span className="shrink-0 text-[13px] font-semibold text-text-muted tabular-nums">{countLabel}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {lines.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-text-muted">{emptyText}</p>
        ) : (
          <ul className="flex list-none flex-col p-0">
            {lines.map((line) => (
              <li
                key={line.key}
                className={cn(
                  "flex items-center gap-2 rounded-[10px] px-2 py-2",
                  "motion-safe:animate-line-in",
                  line.justChanged && "motion-safe:animate-line-bump"
                )}
              >
                <VegMark isVeg={line.isVeg} size={12} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">{line.name}</span>
                  <span className="text-[12px] text-text-muted tabular-nums">{rupees(line.unitPrice)}</span>
                </span>
                <QuantityStepper
                  value={line.quantity}
                  onChange={(delta) => onChange(line.key, delta)}
                  decreaseLabel={decreaseLabel}
                  increaseLabel={increaseLabel}
                  tone="outline"
                />
                <span className="w-[58px] shrink-0 text-right text-sm font-extrabold tabular-nums">{rupees(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 border-t border-border px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-bold text-text-muted">{totalLabel}</span>
          <span className="text-[22px] font-extrabold tabular-nums">{rupees(total)}</span>
        </div>
        {children}
        {count > 0 ? action : null}
      </div>
    </div>
  );
}
