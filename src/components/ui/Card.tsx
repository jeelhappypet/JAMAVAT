import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/** White rounded panel with the design's hairline border. `padding` none for tables that run edge to edge. */
export function Card({ padding = "md", className, children, ...props }: Omit<HTMLAttributes<HTMLElement>, "className"> & { padding?: "none" | "sm" | "md"; className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-[18px] border border-border bg-surface", padding === "md" ? "p-[18px]" : padding === "sm" ? "p-4" : "overflow-hidden", className)} {...props}>
      {children}
    </section>
  );
}
