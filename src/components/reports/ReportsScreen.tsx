"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { Alert } from "@/components/ui/Alert";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useThrottled } from "@/lib/utils/useThrottled";
import type { MonthReportDTO } from "@/types";

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/** Admin "Reports": one month at a time, day by day — same figures as Today, longer view. */
export function ReportsScreen({ thisMonth }: { thisMonth: string }) {
  const { t, lang } = useI18n();
  const [month, setMonth] = useState(thisMonth);
  const [report, setReport] = useState<MonthReportDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/month?month=${month}`, { cache: "no-store" });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      setReport(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("err.reportLoad"));
    }
  }, [month, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- (re)load when the month changes
    load();
  }, [load]);
  const loadSoon = useThrottled(load, 10000);
  useRealtime({ [REALTIME_EVENTS.ADMIN_STATS_UPDATED]: loadSoon });

  const locale = lang === "gu" ? "gu-IN" : "en-IN";
  const dayLabel = (date: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T00:00:00Z`));
  const current = report && report.month === month ? report : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-extrabold tracking-tight">{t("reports.title")}</h1>
          <span className="text-sm text-text-muted">{t("reports.subtitle")}</span>
        </div>
        <MonthPicker value={month} onChange={setMonth} max={thisMonth} />
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {!current ? (
        <LoadingState />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Kpi label={t("reports.sales")} value={rupees(current.sales)} big />
            <Kpi label={t("today.orders")} value={String(current.orders)} note={t("today.split", { dineIn: current.dineIn, parcel: current.parcel })} />
            <Kpi label={t("reports.bills")} value={String(current.bills)} note={t("reports.billsNote")} />
            <Kpi label={t("today.cancelled")} value={String(current.cancelled)} />
          </div>

          <section className="flex flex-col gap-2.5 rounded-[18px] border border-border bg-surface px-5 py-[18px]">
            <h2 className="text-[17px] font-extrabold">{t("reports.byDay")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs tracking-wide text-text-muted">
                    <th className="py-2 font-bold">{t("today.colDay")}</th>
                    <th className="px-2 py-2 text-right font-bold">{t("today.colOrders")}</th>
                    <th className="px-2 py-2 text-right font-bold">{t("reports.colDineIn")}</th>
                    <th className="px-2 py-2 text-right font-bold">{t("reports.colParcel")}</th>
                    <th className="px-2 py-2 text-right font-bold">{t("today.colSales")}</th>
                    <th className="py-2 text-right font-bold">{t("today.colCancelled")}</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {current.days.length === 0 ? (
                    <tr className="border-t border-stone-100">
                      <td colSpan={6} className="py-6 text-center text-text-muted">
                        {t("today.noOrders")}
                      </td>
                    </tr>
                  ) : (
                    current.days.map((day) => (
                      <tr key={day.date} className={`border-t border-stone-100 ${day.orders === 0 && day.cancelled === 0 ? "text-text-muted" : ""}`}>
                        <td className="py-2.5 font-semibold">{dayLabel(day.date)}</td>
                        <td className="px-2 py-2.5 text-right">{day.orders}</td>
                        <td className="px-2 py-2.5 text-right">{day.dineIn}</td>
                        <td className="px-2 py-2.5 text-right">{day.parcel}</td>
                        <td className="px-2 py-2.5 text-right font-bold">{rupees(day.sales)}</td>
                        <td className="py-2.5 text-right">{day.cancelled}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Kpi({ label, value, note, big = false }: { label: string; value: string; note?: string; big?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-[18px] border border-border bg-surface px-5 py-[18px] ${big ? "flex-[2_1_280px]" : "flex-[1_1_180px]"}`}>
      <span className="text-sm font-semibold text-text-muted">{label}</span>
      <span className={`${big ? "text-[40px] leading-[1.05] tracking-tight" : "text-[30px]"} font-extrabold`}>{value}</span>
      {note ? <span className="text-[13px] text-text-muted">{note}</span> : null}
    </div>
  );
}
