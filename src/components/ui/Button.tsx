import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "success" | "danger" | "secondary" | "ghost";
type Size = "md" | "lg" | "xl";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-brand text-white active:bg-brand-dark",
  success: "bg-success text-white active:brightness-90",
  danger: "bg-danger text-white active:brightness-90",
  secondary: "bg-surface text-foreground border border-border active:bg-surface-muted",
  ghost: "bg-transparent text-foreground active:bg-surface-muted",
};

const SIZE_CLASS: Record<Size, string> = {
  md: "min-h-11 px-4 text-base",
  lg: "min-h-14 px-6 text-lg",
  xl: "min-h-16 px-8 text-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`touch-target inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
