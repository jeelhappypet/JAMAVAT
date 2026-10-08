import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "className" | "onChange"> {
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}

/** The app's dropdown: a styled native <select> (works with every phone's picker). */
export function Select({ options, onChange, size = "md", label, className, ...rest }: SelectProps) {
  const select = (
    <select
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full appearance-none border border-stone-300 bg-surface bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10 font-semibold text-foreground disabled:opacity-60",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2357534e' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        size === "sm" ? "h-10 rounded-[10px] px-3 text-sm" : "h-12 rounded-xl px-3.5 text-base",
        !label && className
      )}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
  if (!label) return select;
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm font-bold", className)}>
      {label}
      {select}
    </label>
  );
}
