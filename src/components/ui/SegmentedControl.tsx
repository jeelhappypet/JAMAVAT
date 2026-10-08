import type { ReactNode } from "react";
import { cn } from "./cn";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  /** Spoken name of the group. */
  label: string;
  /** md: report ranges and filters · lg: the guest's menu tabs (equal width). */
  size?: "md" | "lg";
  className?: string;
}

/** Grey track with a white "selected" pill — ranges, filters, menu tabs, Veg/Non-veg. */
export function SegmentedControl<T extends string>({ options, value, onChange, label, size = "md", className }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("flex gap-1 p-1", size === "lg" ? "rounded-[14px] bg-stone-200/70" : "flex-wrap rounded-xl bg-stone-200", className)}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => !on && onChange(option.value)}
            className={cn(
              "flex items-center justify-center gap-2",
              size === "lg" ? "h-[46px] flex-1 rounded-[11px] text-[15px] font-bold" : "h-[38px] rounded-[9px] px-3.5 text-sm",
              on ? cn("bg-surface shadow-sm", size === "lg" ? "text-brand-dark" : "font-bold text-foreground") : cn("text-stone-700", size === "md" && "font-semibold")
            )}
          >
            {option.label}
            {option.count !== undefined ? <span className="text-xs font-semibold text-text-muted">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
