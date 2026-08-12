import { Card } from "@/components/ui/Card";
import { MENU_CATEGORIES } from "@/types";
import type { OrderItemDTO } from "@/types";

interface KitchenTicketProps {
  tokenNumber: number;
  customerName?: string;
  items: OrderItemDTO[];
  onReady: () => void;
  busy?: boolean;
}

export function KitchenTicket({ tokenNumber, customerName, items, onReady, busy }: KitchenTicketProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        {customerName ? <p className="text-lg text-text-muted">{customerName}</p> : <span />}
        <p className="text-5xl font-extrabold text-brand">{tokenNumber}</p>
      </div>

      <div className="flex flex-col gap-3">
        {MENU_CATEGORIES.map((category) => {
          const categoryItems = items.filter((item) => item.categorySnapshot === category);
          if (categoryItems.length === 0) return null;
          return (
            <div key={category}>
              <p className="text-sm font-semibold text-text-muted">{category}</p>
              <ul>
                {categoryItems.map((item) => (
                  <li key={item.menuItemId} className="flex justify-between py-0.5 text-lg font-medium">
                    <span>{item.nameSnapshot}</span>
                    <span>× {item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onReady}
        disabled={busy}
        className="touch-target flex items-center justify-center gap-2 rounded-2xl bg-success-light py-4 text-lg font-semibold text-success disabled:opacity-50"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
        તૈયાર છે
      </button>
    </Card>
  );
}
