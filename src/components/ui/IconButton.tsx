import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Tone = "light" | "dark";

interface CommonProps {
  /** Required: icon-only buttons need a spoken name (also shown as a tooltip). */
  label: string;
  size?: "sm" | "md";
  tone?: Tone;
  danger?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "aria-label"> & { href?: undefined };
type AnchorProps = CommonProps & { href: string; download?: boolean; newTab?: boolean };

const SIZE = { sm: "h-10 w-10 rounded-[10px]", md: "h-11 w-11 rounded-xl" };
const TONE: Record<Tone, string> = {
  light: "border border-border bg-surface text-foreground active:bg-surface-muted",
  dark: "border border-stone-600 bg-transparent text-white",
};

/** Square icon button (back, download, regenerate, sound…). Pass `href` for a link or download. */
export function IconButton(props: ButtonProps | AnchorProps) {
  const { label, size = "sm", tone = "light", danger = false, className, children } = props;
  const classes = cn("flex shrink-0 items-center justify-center disabled:opacity-35", SIZE[size], TONE[tone], danger && "text-danger", className);
  if (props.href !== undefined) {
    if (props.download || props.newTab || props.href.startsWith("/api/")) {
      return (
        <a href={props.href} download={props.download || undefined} target={props.newTab ? "_blank" : undefined} rel={props.newTab ? "noreferrer" : undefined} aria-label={label} title={label} className={classes}>
          {children}
        </a>
      );
    }
    return (
      <Link href={props.href} aria-label={label} title={label} className={classes}>
        {children}
      </Link>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip the styling props before spreading onto <button>
  const { label: _l, size: _s, tone: _t, danger: _d, className: _c, children: _ch, type = "button", ...rest } = props;
  return (
    <button type={type} aria-label={label} title={label} className={classes} {...rest}>
      {children}
    </button>
  );
}
