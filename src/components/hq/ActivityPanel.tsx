"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SidePanel } from "@/components/ui/SidePanel";
import { SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ActivityLogDTO } from "@/types";

const when = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** What HQ did, across every restaurant — opened from the clock icon in HqHeader. */
export function ActivityPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [entries, setEntries] = useState<ActivityLogDTO[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/hq/activity");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't load activity");
      setEntries(data.entries);
      setCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load activity");
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches once, only when the panel is actually opened, not on every HQ page load
    if (open && entries === null) void load();
  }, [open, entries, load]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/hq/activity?cursor=${cursor}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't load more");
      setEntries((prev) => [...(prev ?? []), ...data.entries]);
      setCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load more");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <SidePanel open={open} onClose={onClose} title="Activity">
      {error ? <Alert>{error}</Alert> : null}
      {entries === null ? (
        <SkeletonList rows={6} bare header={false} />
      ) : entries.length === 0 ? (
        <EmptyState title="Nothing yet" hint="Actions you take in HQ — adding a restaurant, recording a payment, changing a plan — show up here." />
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-0.5 border-b border-dashed border-border pb-3 text-[14px]">
              <span className="font-bold">{entry.summary}</span>
              <span className="text-[13px] text-text-muted">
                {when(entry.createdAt)} · {entry.hqEmail}
                {entry.restaurantId ? (
                  <>
                    {" · "}
                    <Link href={`/hq/restaurants/${entry.restaurantId}`} onClick={onClose} className="font-semibold text-brand-dark">
                      {entry.restaurantName ?? "Open"}
                    </Link>
                  </>
                ) : null}
              </span>
            </div>
          ))}
          {cursor ? (
            <Button variant="secondary" size="md" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </div>
      )}
    </SidePanel>
  );
}
