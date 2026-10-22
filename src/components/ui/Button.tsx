import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "dangerSolid" | "success" | "successSoft" | "dark" | "outlineDark" | "ghost" | "link";
export type ButtonSize = "inline" | "sm" | "md" | "lg" | "xl";

/**
 * `hover:` is paired with every `active:` so the website's buttons answer a
 * mouse; on the staff screens, which are touch, only `active:` ever fires.
 */
const VARIANT: Record<ButtonVariant, string> = {
  /** Brand orange — the one main action on a screen. */
  primary: "bg-brand font-extrabold text-white hover:bg-brand-dark active:bg-brand-dark",
  /** Neutral outline — secondary actions ("Add table", "Cancel"). */
  secondary: "border border-border bg-surface font-bold text-foreground hover:border-brand hover:text-brand active:bg-surface-muted",
  /** Brand outline — "ADD", "Order more". */
  outline: "border-[1.5px] border-brand bg-surface font-extrabold text-brand hover:bg-brand-light active:bg-brand-light",
  danger: "border border-red-200 bg-surface font-bold text-danger hover:bg-danger-light active:bg-danger-light",
  dangerSolid: "bg-danger font-extrabold text-white hover:brightness-90 active:brightness-90",
  success: "bg-success font-extrabold text-white hover:brightness-90 active:brightness-90",
  /** Kitchen "Mark ready". */
  successSoft: "bg-success-light font-extrabold text-green-800 hover:brightness-95 active:brightness-95",
  dark: "bg-ink font-extrabold text-white hover:bg-ink-soft active:bg-ink-soft",
  /** On the dark kitchen header. */
  outlineDark: "border border-white/25 bg-transparent font-semibold text-white hover:bg-white/10",
  ghost: "bg-transparent font-bold text-foreground hover:bg-surface-muted active:bg-surface-muted",
  /** Inline text action inside a sentence or a row ("Change", "Resend", "Not you?"). Use with size "inline". */
  link: "bg-transparent font-bold text-brand underline-offset-2 hover:underline",
};

const SIZE: Record<ButtonSize, string> = {
  inline: "min-h-6 px-1 text-sm",
  sm: "h-10 rounded-[10px] px-3.5 text-sm",
  md: "h-11 rounded-xl px-4 text-sm",
  lg: "h-12 rounded-xl px-[18px] text-[15px]",
  xl: "h-14 rounded-[14px] px-6 text-[17px]",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Icon before the label (an inline <svg>). */
  icon?: ReactNode;
  /** Layout only: width, flex, margin. */
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };
type LinkProps = CommonProps & { href: string; onClick?: () => void; "aria-label"?: string };

export function buttonClass({ variant = "primary", size = "md", fullWidth = false, className }: Pick<CommonProps, "variant" | "size" | "fullWidth" | "className">) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
    VARIANT[variant],
    SIZE[size],
    fullWidth && "w-full",
    className
  );
}

/**
 * The one button for the whole app (staff and guest). Pass `href` to get a
 * link styled the same way. See CLAUDE.md → UI components.
 */
export function Button(props: ButtonProps | LinkProps) {
  const { variant, size, fullWidth, icon, className, children } = props;
  const classes = buttonClass({ variant, size, fullWidth, className });
  if (props.href !== undefined) {
    return (
      <Link href={props.href} onClick={props.onClick} aria-label={props["aria-label"]} className={classes}>
        {icon}
        {children}
      </Link>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip the styling props before spreading onto <button>
  const { variant: _v, size: _s, fullWidth: _f, icon: _i, className: _c, children: _ch, type = "button", ...rest } = props;
  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}
