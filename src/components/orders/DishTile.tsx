"use client";

import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { cn } from "@/components/ui/cn";

interface DishTileProps {
  name: string;
  /** The other language's name, under it, when the dish has one. */
  subName?: string;
  price: number;
  isVeg: boolean;
  /** Kitchen has flipped it off for today. */
  soldOut?: boolean;
  /** How many are in the bill. 0 means the tile is still a plain "add" button. */
  quantity: number;
  onAdd: () => void;
  onChange: (delta: 1 | -1) => void;
  addLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  soldOutLabel: string;
}

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * One dish on the till's grid.
 *
 * The whole tile is the button while the dish is not in the bill — on a
 * counter tablet a thumb wants the largest target there is, not a small "ADD"
 * in a corner. Once it is in the bill the tile keeps its count and shows a
 * stepper, so a wrong tap is undone where it happened instead of in the bill
 * pane on the far side of the screen.
 *
 * A sold-out dish stays on the grid, greyed and not tappable, rather than
 * vanishing: a dish that disappears reads as "I am looking in the wrong
 * category" and the person hunts for it.
 */
export function DishTile({
  name,
  subName,
  price,
  isVeg,
  soldOut = false,
  quantity,
  onAdd,
  onChange,
  addLabel,
  decreaseLabel,
  increaseLabel,
  soldOutLabel,
}: DishTileProps) {
  const chosen = quantity > 0;

  const body = (
    <>
      <span className="flex items-start gap-2">
        <VegMark isVeg={isVeg} />
        <span className="min-w-0 flex-1">
          <span className="block text-left text-[15px] font-bold leading-tight">{name}</span>
          {subName ? <span className="mt-0.5 block truncate text-left text-[13px] text-text-muted">{subName}</span> : null}
        </span>
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="text-[15px] font-extrabold tabular-nums">{rupees(price)}</span>
        {soldOut ? <span className="text-[11px] font-extrabold uppercase tracking-wide text-danger">{soldOutLabel}</span> : null}
      </span>
    </>
  );

  const shell = cn(
    "flex min-h-[96px] flex-col justify-between gap-2 rounded-[14px] border p-3 text-left",
    soldOut
      ? "cursor-not-allowed border-border bg-surface-muted opacity-55"
      : chosen
        ? "border-brand bg-brand-light"
        : "tap-tile border-border bg-surface hover:border-brand hover:bg-brand-light/40"
  );

  if (soldOut) {
    return (
      <div className={shell} aria-disabled>
        {body}
      </div>
    );
  }

  // Already in the bill: the tile stops being one button, because the stepper
  // inside it needs its own two.
  if (chosen) {
    return (
      <div className={shell}>
        {body}
        <QuantityStepper value={quantity} onChange={onChange} decreaseLabel={decreaseLabel} increaseLabel={increaseLabel} className="w-full justify-between" />
      </div>
    );
  }

  return (
    <button type="button" onClick={onAdd} aria-label={addLabel} className={shell}>
      {body}
    </button>
  );
}

/** The green/brown square every Indian menu carries, by law on packaged food. */
export function VegMark({ isVeg, size = 14 }: { isVeg: boolean; size?: number }) {
  return (
    <span
      className={cn("mt-0.5 flex shrink-0 items-center justify-center rounded-[3px] border-[1.5px]", isVeg ? "border-success" : "border-danger")}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className={cn("rounded-full", isVeg ? "bg-success" : "bg-danger")} style={{ width: size * 0.45, height: size * 0.45 }} />
    </span>
  );
}
