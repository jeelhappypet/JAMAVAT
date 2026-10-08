import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "green" | "orange" | "red" | "stone" | "brand";

const TONE: Record<Tone, string> = {
  green: "bg-success-light text-green-800",
  orange: "bg-orange-100 text-brand-dark",
  red: "bg-danger-light text-red-800",
  stone: "bg-stone-200 text-stone-900",
  brand: "bg-brand text-white",
};

/** Small rounded status pill ("Verified", "Cooking", "You"). */
export function Badge({ tone = "stone", size = "md", children, className }: { tone?: Tone; size?: "sm" | "md"; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full font-bold", size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs", TONE[tone], className)}>
      {children}
    </span>
  );
}
