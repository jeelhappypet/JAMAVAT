import { cn } from "./cn";

interface QuantityStepperProps {
  value: number;
  onChange: (delta: 1 | -1) => void;
  decreaseLabel: string;
  increaseLabel: string;
  /** solid: orange pill on the menu card · outline: bordered, in the cart. */
  tone?: "solid" | "outline";
  className?: string;
}

/** − 2 + control for dish quantities. */
export function QuantityStepper({ value, onChange, decreaseLabel, increaseLabel, tone = "solid", className }: QuantityStepperProps) {
  const solid = tone === "solid";
  const button = cn("flex items-center justify-center font-bold", solid ? "h-10 w-8 text-xl text-white" : "h-9 w-8 text-lg text-brand");
  return (
    <div className={cn("flex items-center", solid ? "h-10 w-24 justify-between rounded-[10px] bg-brand text-white" : "h-9 rounded-[10px] border border-border", className)}>
      <button type="button" onClick={() => onChange(-1)} aria-label={decreaseLabel} className={button}>
        −
      </button>
      <span className={cn("text-center font-extrabold", solid ? "text-[15px]" : "min-w-[18px] text-sm")}>{value}</span>
      <button type="button" onClick={() => onChange(1)} aria-label={increaseLabel} className={button}>
        +
      </button>
    </div>
  );
}
