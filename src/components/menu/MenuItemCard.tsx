import type { ReactNode } from "react";

interface MenuItemCardProps {
  name: string;
  price: number;
  quantity?: number;
  onClick?: () => void;
  trailing?: ReactNode;
}

export function MenuItemCard({ name, price, quantity = 0, onClick, trailing }: MenuItemCardProps) {
  const selected = quantity > 0;

  return (
    <div
      className={`relative flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors ${
        selected ? "border-brand bg-brand-light" : "border-border bg-surface"
      }`}
    >
      {selected ? (
        <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-1.5 text-sm font-bold text-white">
          ×{quantity}
        </span>
      ) : null}
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="touch-target flex flex-1 flex-col items-start gap-1 text-left active:opacity-70"
        >
          <span className="text-base font-semibold leading-snug">{name}</span>
          <span className="text-sm text-text-muted">₹{price}</span>
        </button>
      ) : (
        <div className="flex flex-1 flex-col items-start gap-1">
          <span className="text-base font-semibold leading-snug">{name}</span>
          <span className="text-sm text-text-muted">₹{price}</span>
        </div>
      )}
      {trailing}
    </div>
  );
}
