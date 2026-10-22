"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SkeletonReport } from "@/components/ui/Skeleton";
import { TRACKED_LABELS } from "@/lib/site/statLabels";
import type { SiteStatsDTO } from "@/types";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

const number = (value: number) => value.toLocaleString("en-IN");

/** "18 Oct" — the bar chart's axis, short enough for 90 of them. */
const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** "/" reads as nothing in a list; every other path is its own label already. */
const pageLabel = (path: string) => (path === "/" ? "Home" : path);

function Change({ now, before }: { now: number; before: number }) {
  if (before === 0) return <span className="text-sm text-text-muted">no earlier data</span>;
  const percent = Math.round(((now - before) / before) * 100);
  const up = percent >= 0;
  return (
    <span className={`text-sm font-bold ${up ? "text-success" : "text-danger"}`}>
      {up ? "▲" : "▼"} {Math.abs(percent)}% vs the period before
    </span>
  );
}

function Kpi({ title, value, children }: { title: string; value: string; children?: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-text-muted">{title}</span>
      <span className="text-[30px] font-extrabold leading-none tracking-tight">{value}</span>
      {children}
    </Card>
  );
}

/** A list of "label ———— 42" rows, each bar as wide as its share of the biggest. */
function BarList({ rows, empty }: { rows: { key: string; label: string; value: number }[]; empty: string }) {
  const top = Math.max(1, ...rows.map((row) => row.value));
  if (rows.length === 0) return <p className="py-3 text-[15px] text-text-muted">{empty}</p>;
  return (
    <ul className="flex list-none flex-col gap-2.5 p-0">
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="min-w-0 truncate font-semibold">{row.label}</span>
            <span className="shrink-0 font-extrabold">{number(row.value)}</span>
          </span>
          <span className="h-2 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
            <span className="block h-full rounded-full bg-brand" style={{ width: `${(row.value / top) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * How Jamavat's own website is doing: visits, which pages they land on, and
 * which buttons they press. Counted by components/site/SiteAnalytics.tsx —
 * aggregate numbers only, nothing that identifies a visitor.
 */
export function WebsiteScreen() {
  const [days, setDays] = useState("7");
  const [stats, setStats] = useState<SiteStatsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hq/stats?days=${days}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not load the website numbers.");
    }
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- (re)load when the range changes
    load();
  }, [load]);

  const current = stats && String(stats.days) === days ? stats : null;
  const busiest = current ? Math.max(1, ...current.byDay.map((entry) => entry.views)) : 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-extrabold tracking-tight">Website</h1>
          <span className="text-sm text-text-muted">
            {current ? `${dayLabel(current.from)} – ${dayLabel(current.to)}` : "Visits and button presses on jamavat.vercel.app"}
          </span>
        </div>
        <SegmentedControl label="Range" value={days} onChange={setDays} options={RANGES} />
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {!current ? (
        <SkeletonReport />
      ) : current.views === 0 && current.clicks === 0 ? (
        <EmptyState
          title="Nothing counted yet"
          hint="Numbers appear here once people start opening the website. Crawlers and preview bots are left out on purpose, so this stays at zero until a real visitor arrives."
        />
      ) : (
        <>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <Kpi title="Page views" value={number(current.views)}>
              <Change now={current.views} before={current.previousViews} />
            </Kpi>
            <Kpi title="Button presses" value={number(current.clicks)} />
            <Kpi
              title="Presses per 100 views"
              value={current.views ? String(Math.round((current.clicks / current.views) * 100)) : "—"}
            />
            <Kpi
              title="ગુજરાતી share"
              value={
                current.views
                  ? `${Math.round(((current.byLang.find((entry) => entry.lang === "gu")?.views ?? 0) / current.views) * 100)}%`
                  : "—"
              }
            />
          </div>

          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold">Views per day</h2>
            <div className="flex h-[160px] items-end gap-1" role="img" aria-label={`Page views per day from ${current.from} to ${current.to}`}>
              {/* The bar is the flex item itself. Wrapped in a column span it drew
                  nothing: `items-end` shrinks each item to its content, and a
                  percentage height against an auto-height parent is auto. */}
              {current.byDay.map((entry) => (
                <span
                  key={entry.day}
                  title={`${dayLabel(entry.day)}: ${number(entry.views)} views`}
                  className="block min-w-0 flex-1 rounded-t-[4px] bg-brand"
                  style={{ height: `${Math.max(2, (entry.views / busiest) * 100)}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[13px] text-text-muted">
              <span>{dayLabel(current.from)}</span>
              <span>{dayLabel(current.to)}</span>
            </div>
          </Card>

          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-extrabold">Pages</h2>
              <BarList
                rows={current.byPage.map((row) => ({ key: row.path, label: pageLabel(row.path), value: row.views }))}
                empty="No page views in this range."
              />
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-extrabold">Buttons pressed</h2>
              <BarList
                rows={current.byClick.map((row) => ({ key: row.label, label: TRACKED_LABELS[row.label] ?? row.label, value: row.count }))}
                empty="Nobody has pressed a tracked button in this range."
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
