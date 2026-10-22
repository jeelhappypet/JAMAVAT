import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "className" | "onChange"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
  /** Text next to the box. Without it, pass `aria-label`. */
  label?: ReactNode;
  /** plain: box + text · chip: the whole label is a bordered pill that turns red when ticked ("Sold out" on menu rows). */
  variant?: "plain" | "chip";
  className?: string;
}

const SIZE = { sm: "h-[18px] w-[18px]", md: "h-5 w-5", lg: "h-6 w-6" };

/** Brand-coloured checkbox, optionally with its label. */
export function Checkbox({ checked, onChange, size = "md", label, variant = "plain", className, ...rest }: CheckboxProps) {
  const box = (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className={cn("m-0 shrink-0 cursor-pointer accent-brand disabled:cursor-default", SIZE[size], !label && className)}
      {...rest}
    />
  );
  if (!label) return box;
  if (variant === "chip") {
    return (
      <label
        className={cn(
          "inline-flex h-10 shrink-0 cursor-pointer select-none items-center gap-2 rounded-[10px] border px-3 text-sm transition-colors",
          checked ? "border-red-200 bg-danger-light font-bold text-danger" : "border-stone-300 bg-surface font-semibold text-stone-700 hover:bg-surface-muted",
          className
        )}
      >
        {box}
        <span className="whitespace-nowrap">{label}</span>
      </label>
    );
  }
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5", className)}>
      {box}
      <span className="min-w-0">{label}</span>
    </label>
  );
}
