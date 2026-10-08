import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "className" | "onChange"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
  /** Text next to the box. Without it, pass `aria-label`. */
  label?: ReactNode;
  className?: string;
}

const SIZE = { sm: "h-[18px] w-[18px]", md: "h-5 w-5", lg: "h-6 w-6" };

/** Brand-coloured checkbox, optionally with its label. */
export function Checkbox({ checked, onChange, size = "md", label, className, ...rest }: CheckboxProps) {
  const box = (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className={cn("m-0 shrink-0 cursor-pointer accent-[#c2410c] disabled:cursor-default", SIZE[size], !label && className)}
      {...rest}
    />
  );
  if (!label) return box;
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5", className)}>
      {box}
      <span className="min-w-0">{label}</span>
    </label>
  );
}
