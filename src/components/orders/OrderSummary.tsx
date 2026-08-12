import type { ReactNode } from "react";
import { OrderItemRow } from "./OrderItemRow";

export interface OrderLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface OrderSummaryProps {
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  lines: OrderLine[];
  totalAmount: number;
  onIncrement: (menuItemId: string) => void;
  onDecrement: (menuItemId: string) => void;
  footer?: ReactNode;
}

export function OrderSummary({
  customerName,
  onCustomerNameChange,
  lines,
  totalAmount,
  onIncrement,
  onDecrement,
  footer,
}: OrderSummaryProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex max-h-[75vh] flex-col rounded-t-3xl border-t border-border bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.12)] lg:sticky lg:top-6 lg:inset-x-auto lg:bottom-auto lg:max-h-[calc(100vh-3rem)] lg:rounded-3xl lg:border lg:shadow-sm">
      <div className="flex flex-col gap-3 p-4">
        <input
          type="text"
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="ગ્રાહકનું નામ"
          className="touch-target rounded-xl border border-border bg-background px-4 text-base"
        />
      </div>

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

      <div className="flex flex-col gap-4 border-t border-border p-4">
        <div className="flex items-center justify-between text-xl font-bold">
          <span>કુલ</span>
          <span>₹{totalAmount}</span>
        </div>
        {footer}
      </div>
    </div>
  );
}
