interface OrderItemRowProps {
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function OrderItemRow({
  name,
  unitPrice,
  quantity,
  lineTotal,
  onIncrement,
  onDecrement,
}: OrderItemRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium">{name}</p>
        <p className="text-sm text-text-muted">₹{unitPrice} પ્રતિ નંગ</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrement}
          aria-label="ઘટાડો"
          className="touch-target flex h-9 w-9 items-center justify-center rounded-full border border-border text-lg font-bold active:bg-surface-muted"
        >
          −
        </button>
        <span className="w-6 text-center font-semibold">{quantity}</span>
        <button
          type="button"
          onClick={onIncrement}
          aria-label="વધારો"
          className="touch-target flex h-9 w-9 items-center justify-center rounded-full border border-border text-lg font-bold active:bg-surface-muted"
        >
          +
        </button>
      </div>

      <span className="w-16 shrink-0 text-right font-semibold">₹{lineTotal}</span>
    </div>
  );
}
