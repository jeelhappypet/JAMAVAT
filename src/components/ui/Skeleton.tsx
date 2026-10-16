"use client";

import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "./cn";

/** One grey pulsing block in the shape of the text or box that is loading. `className`: size and layout only. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-lg bg-stone-200", className)} />;
}

/** Says "Loading…" once to screen readers; the blocks inside are silent. */
function Loading({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t("common.loading")} aria-busy="true" className={className} style={style}>
      {children}
    </div>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

type CardKind = "ticket" | "table";

/**
 * Placeholder cards in the same grid the real cards use:
 * ticket — kitchen tickets, running orders, a seat's orders (label, dish lines, button);
 * table — a table with its seat tiles / QRs.
 */
export function SkeletonCards({ count = 4, minWidth = 260, kind = "ticket" }: { count?: number; minWidth?: number; kind?: CardKind }) {
  return (
    <Loading className="grid gap-3.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))` }}>
      {range(count).map((i) =>
        kind === "ticket" ? (
          <div key={i} className="flex flex-col gap-3 rounded-[18px] border-2 border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2.5 border-b border-border pb-3">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3.5 w-32" />
              </div>
              <Skeleton className="h-7 w-14 rounded-full" />
            </div>
            <div className="flex flex-col gap-2.5">
              {range(2 + (i % 2)).map((line) => (
                <div key={line} className="flex justify-between gap-3">
                  <Skeleton className={cn("h-5", line % 2 ? "w-1/2" : "w-2/3")} />
                  <Skeleton className="h-5 w-8" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-1 h-14 w-full rounded-[14px]" />
          </div>
        ) : (
          <div key={i} className="flex flex-col gap-2.5 rounded-[18px] border border-border bg-surface p-3">
            <Skeleton className="h-4 w-20" />
            <div className="grid grid-cols-2 gap-2">
              {range(2).map((seat) => (
                <div key={seat} className="flex min-h-[104px] flex-col justify-between rounded-[14px] border-[1.5px] border-stone-200 p-3">
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </Loading>
  );
}

/** A bordered panel of rows — menus, staff, the sold-out list. `bare` drops the panel (inside a list that already has one). */
export function SkeletonList({ rows = 6, bare = false, header = true }: { rows?: number; bare?: boolean; header?: boolean }) {
  return (
    <Loading className={bare ? "flex flex-col" : "flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface"}>
      {header ? (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-stone-50 px-[18px] py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-28 rounded-[10px]" />
        </div>
      ) : null}
      {range(rows).map((i) => (
        <div key={i} className="flex min-h-14 items-center gap-4 border-t border-stone-100 px-[18px] py-3 first:border-t-0">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className={cn("h-4", i % 3 === 0 ? "w-1/2" : i % 3 === 1 ? "w-2/5" : "w-3/5")} />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-10 w-24 rounded-[10px] sm:block" />
        </div>
      ))}
    </Loading>
  );
}

/** Dish cards for the counter's order screen, grouped like CategorySection. */
export function SkeletonDishes({ sections = 2, perSection = 8 }: { sections?: number; perSection?: number }) {
  return (
    <Loading className="flex flex-col gap-6">
      {range(sections).map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-28" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {range(perSection).map((i) => (
              <div key={i} className="flex min-h-[76px] flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
                <Skeleton className={cn("h-4", i % 2 ? "w-3/4" : "w-1/2")} />
                <Skeleton className="h-3.5 w-10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Loading>
  );
}

/** The KPI tiles and chart panels of Today / monthly reports. */
export function SkeletonReport() {
  return (
    <Loading className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap gap-3">
        {range(4).map((i) => (
          <div key={i} className={cn("flex flex-col gap-2.5 rounded-[18px] border border-border bg-surface px-5 py-[18px]", i === 0 ? "flex-[2_1_280px]" : "flex-[1_1_180px]")}>
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className={cn(i === 0 ? "h-12 w-40" : "h-8 w-20")} />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-[18px]">
        <div className="flex min-w-0 flex-[2_1_480px] flex-col gap-4 rounded-[18px] border border-border bg-surface p-5">
          <Skeleton className="h-5 w-36" />
          <div className="flex h-48 items-end gap-2">
            {[40, 65, 30, 85, 55, 95, 45, 70, 35, 60, 25, 50].map((height, i) => (
              <span key={i} aria-hidden className="flex-1 animate-pulse rounded-t-md bg-stone-200" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3 rounded-[18px] border border-border bg-surface p-5">
          <Skeleton className="h-5 w-32" />
          {range(4).map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}
