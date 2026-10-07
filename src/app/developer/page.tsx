"use client";

import { useCallback, useEffect, useState } from "react";
import { HomeButton } from "@/components/ui/HomeButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { AdminStatCard } from "@/components/developer/AdminStatCard";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import type { DeveloperStats } from "@/types";

const POLL_MS = 20000;

type LoadStatus = "loading" | "error" | "ready";

export default function DeveloperPage() {
  // Access is enforced by the proxy + API (admin staff only) — no separate login here.
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [stats, setStats] = useState<DeveloperStats | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/developer/stats");
      if (redirectToLoginIfUnauthorized(res)) return;
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data);
      setStatus("ready");
    } catch {
      setStatus((prev) => (prev === "ready" ? prev : "error"));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial stats fetch on mount
    loadStats();
  }, [loadStats]);

  const { state: connectionState } = useRealtime({
    [REALTIME_EVENTS.ADMIN_STATS_UPDATED]: loadStats,
  });
  usePeriodicRefresh(loadStats, POLL_MS, connectionState !== "connected");

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <HomeButton />
        <h1 className="text-xl font-bold">એડમિન</h1>
        <RealtimeStatus state={connectionState} />
      </div>

      {status === "loading" ? <LoadingState /> : null}
      {status === "error" ? <p className="text-center text-danger">આંકડા લાવી શકાયા નથી</p> : null}

      {status === "ready" && stats ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <AdminStatCard label="આજના ઓર્ડર" value={String(stats.todayOrders)} />
            <AdminStatCard label="આજની આવક" value={`₹${stats.todayRevenue}`} />
            <AdminStatCard label="કુલ ઓર્ડર" value={String(stats.totalOrders)} />
            <AdminStatCard label="પૂર્ણ ઓર્ડર" value={String(stats.completedOrders)} />
            <AdminStatCard label="રદ ઓર્ડર" value={String(stats.cancelledOrders)} />
            <AdminStatCard label="બાકી ઓર્ડર" value={String(stats.pendingOrders)} />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-text-muted">
                <tr>
                  <th className="px-4 py-3">તારીખ</th>
                  <th className="px-4 py-3">ઓર્ડર</th>
                  <th className="px-4 py-3">પૂર્ણ</th>
                  <th className="px-4 py-3">રદ</th>
                  <th className="px-4 py-3">આવક</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.dateWise.map((row) => (
                  <tr key={row.businessDate}>
                    <td className="px-4 py-3">{row.businessDate}</td>
                    <td className="px-4 py-3">{row.orders}</td>
                    <td className="px-4 py-3">{row.completed}</td>
                    <td className="px-4 py-3">{row.cancelled}</td>
                    <td className="px-4 py-3">₹{row.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </main>
  );
}
