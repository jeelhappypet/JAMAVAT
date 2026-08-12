import { Card } from "@/components/ui/Card";

interface OrderCardProps {
  tokenNumber: number;
  customerName?: string;
  totalAmount: number;
  onComplete: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function OrderCard({ tokenNumber, customerName, totalAmount, onComplete, onCancel, busy }: OrderCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          {customerName ? <p className="text-base text-text-muted">{customerName}</p> : null}
          <p className="text-5xl font-extrabold text-brand">{tokenNumber}</p>
        </div>
        <p className="text-2xl font-bold">₹{totalAmount}</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="રદ કરો"
          className="touch-target flex flex-1 items-center justify-center rounded-2xl bg-danger-light py-4 text-danger disabled:opacity-50"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={busy}
          aria-label="પૂર્ણ કરો"
          className="touch-target flex flex-1 items-center justify-center rounded-2xl bg-success-light py-4 text-success disabled:opacity-50"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </Card>
  );
}
