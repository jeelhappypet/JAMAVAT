import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "error" | "success" | "warning" | "info";

const TONE: Record<Tone, string> = {
  error: "bg-danger-light text-red-900",
  success: "bg-success-light text-green-900",
  warning: "bg-orange-50 text-orange-900",
  info: "border border-border bg-surface text-stone-700",
};

/** Inline message box. `error` is announced to screen readers. */
export function Alert({ tone = "error", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-[14px] px-4 py-3 text-sm font-semibold leading-relaxed", TONE[tone], className)}>
      {children}
    </div>
  );
}
