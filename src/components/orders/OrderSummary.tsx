import type { ReactNode } from "react";
import { OrderItemRow } from "./OrderItemRow";

export interface OrderLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface OrderSummaryProps {
  tokenNumber?: number;
  lines: OrderLine[];
  totalAmount: number;
  onIncrement: (menuItemId: string) => void;
  onDecrement: (menuItemId: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  footer?: ReactNode;
}

export function OrderSummary({
  tokenNumber,
  lines,
  totalAmount,
  onIncrement,
  onDecrement,
  expanded,
  onExpandedChange,
  footer,
}: OrderSummaryProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex max-h-[75vh] flex-col rounded-t-3xl border-t border-border bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.12)] lg:sticky lg:top-6 lg:inset-x-auto lg:bottom-auto lg:max-h-[calc(100vh-3rem)] lg:rounded-3xl lg:border lg:shadow-sm">
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        className="touch-target flex items-center gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="min-w-0 flex-1 truncate text-lg font-bold">
          ટોકન : {tokenNumber ?? "-"}
        </span>
        <span className="shrink-0 text-xl font-extrabold">₹{totalAmount}</span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {expanded ? (
        <div className="flex-1 overflow-y-auto px-4">
          {lines.length === 0 ? (
            <p className="py-6 text-center text-text-muted">આઇટમ પસંદ કરો</p>
          ) : (
            <div className="divide-y divide-border">
              {lines.map((line) => (
                <OrderItemRow
                  key={line.menuItemId}
                  name={line.name}
                  unitPrice={line.unitPrice}
                  quantity={line.quantity}
                  lineTotal={line.unitPrice * line.quantity}
                  onIncrement={() => onIncrement(line.menuItemId)}
                  onDecrement={() => onDecrement(line.menuItemId)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-border p-4">
        {expanded ? null : (
          <div className="flex min-h-6 items-center justify-between gap-3 text-sm text-text-muted">
            <span>{lines.length > 0 ? `${lines.length} આઇટમ` : "આઇટમ પસંદ કરો"}</span>
            <span>{lines.reduce((sum, line) => sum + line.quantity, 0)} નંગ</span>
          </div>
        )}
        {footer}
      </div>
    </div>
  );
}
