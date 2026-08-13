"use client";

import { useCallback, useEffect, useState } from "react";
import { HomeButton } from "@/components/ui/HomeButton";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { AdminStatCard } from "@/components/developer/AdminStatCard";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import type { DeveloperStats } from "@/types";

const POLL_MS = 20000;

type AuthStatus = "checking" | "guest" | "authenticated";

export default function DeveloperPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [stats, setStats] = useState<DeveloperStats | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/developer/stats");
      if (res.status === 401) {
        setAuthStatus("guest");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data);
      setAuthStatus("authenticated");
    } catch {
      setAuthStatus("guest");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial auth/stats check on mount
    loadStats();
  }, [loadStats]);

  const { state: connectionState } = useRealtime({
    [REALTIME_EVENTS.ADMIN_STATS_UPDATED]: () => {
      if (authStatus === "authenticated") loadStats();
    },
  });
  usePeriodicRefresh(loadStats, POLL_MS, connectionState !== "connected");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/developer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "લોગિન કરી શકાયું નથી");
      setPassword("");
      await loadStats();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "લોગિન કરી શકાયું નથી");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/developer/logout", { method: "POST" });
    setStats(null);
    setUsername("");
    setPassword("");
    setAuthStatus("guest");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <HomeButton />
        <h1 className="text-xl font-bold">એડમિન</h1>
        {authStatus === "authenticated" ? (
          <div className="flex items-center gap-3">
            <RealtimeStatus state={connectionState} />
            <Button variant="secondary" onClick={handleLogout}>
              લોગઆઉટ
            </Button>
          </div>
        ) : (
          <span className="w-11" />
        )}
      </div>

      {authStatus === "checking" ? <LoadingState /> : null}

      {authStatus === "guest" ? (
        <form onSubmit={handleLogin} className="mx-auto flex w-full max-w-sm flex-col gap-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="યુઝરનેમ"
            autoComplete="username"
            className="touch-target rounded-xl border border-border bg-background px-4 text-base"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="પાસવર્ડ"
            autoComplete="current-password"
            className="touch-target rounded-xl border border-border bg-background px-4 text-base"
          />
          {loginError ? <p className="text-center text-danger">{loginError}</p> : null}
          <Button type="submit" size="lg" disabled={loggingIn} className="w-full">
            {loggingIn ? "તપાસી રહ્યા છીએ…" : "લોગિન"}
          </Button>
        </form>
      ) : null}

      {authStatus === "authenticated" && stats ? (
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
