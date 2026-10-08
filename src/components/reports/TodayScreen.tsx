"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import { useThrottled } from "@/lib/utils/useThrottled";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName, type MessageKey } from "@/lib/i18n/messages";
import { REPORT_RANGES, type ReportKpi, type ReportRange, type TodayReportDTO } from "@/types";

const RANGE_LABEL: Record<ReportRange, MessageKey> = { today: "today.rangeToday", yesterday: "today.rangeYesterday", week: "today.rangeWeek", month: "today.rangeMonth" };
const SALES_LABEL: Record<ReportRange, MessageKey> = { today: "today.salesToday", yesterday: "today.salesYesterday", week: "today.salesWeek", month: "today.salesMonth" };
const TOP_LABEL: Record<ReportRange, MessageKey> = { today: "today.topToday", yesterday: "today.topYesterday", week: "today.topWeek", month: "today.topMonth" };
const VS_LABEL: Record<ReportRange, MessageKey> = { today: "today.vsYesterday", yesterday: "today.vsDayBefore", week: "today.vsLastWeek", month: "today.vsLastMonth" };
const PAY_LABEL: Record<TodayReportDTO["byPayment"][number]["mode"], MessageKey> = { UPI: "seatBill.upi", CASH: "seatBill.cash", CARD: "seatBill.card", PARCEL: "today.parcelPaid" };

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
const PLOT_HEIGHT = 160;

/** "Admin · today's report" artboard. Updates live as orders and bills come in. */
export function TodayScreen() {
  const { t, lang } = useI18n();
  const [range, setRange] = useState<ReportRange>("today");
  const [report, setReport] = useState<TodayReportDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/today?range=${range}`, { cache: "no-store" });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      setReport(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("err.reportLoad"));
    }
  }, [range, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- (re)load when the range changes
    load();
  }, [load]);

  // Every order event nudges the report; recompute at most every 5 s.
  const loadSoon = useThrottled(load, 5000);
  const { state } = useRealtime({ [REALTIME_EVENTS.ADMIN_STATS_UPDATED]: loadSoon }, load);
  usePeriodicRefresh(load, 30000, state !== "connected");

  const locale = lang === "gu" ? "gu-IN" : "en-IN";
  const todayLabel = new Intl.DateTimeFormat(locale, { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "short" }).format(new Date());
  const dayLabel = (date: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T00:00:00Z`));
  const current = report && report.range === range ? report : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-extrabold tracking-tight">{t("today.title")}</h1>
          <span className="text-sm text-text-muted">{t("today.subtitle", { date: todayLabel })}</span>
        </div>
        <div role="group" aria-label={t("today.range")} className="flex flex-wrap gap-1 rounded-xl bg-stone-200 p-1">
          {REPORT_RANGES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === range}
              onClick={() => setRange(option)}
              className={`h-[38px] rounded-[9px] px-3.5 text-sm ${option === range ? "bg-surface font-bold text-foreground" : "font-semibold text-stone-700"}`}
            >
              {t(RANGE_LABEL[option])}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
          {error}
        </div>
      ) : null}

      {!current ? (
        <LoadingState />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-[2_1_280px] flex-col gap-1 rounded-[18px] border border-border bg-surface px-5 py-[18px]">
              <span className="text-sm font-semibold text-text-muted">{t(SALES_LABEL[range])}</span>
              <span className="text-[48px] font-extrabold leading-[1.05] tracking-tight">{rupees(current.sales.value)}</span>
              <Delta kpi={current.sales} vs={t(VS_LABEL[range])} format={rupees} />
            </div>
            <div className="flex flex-[1_1_180px] flex-col gap-1 rounded-[18px] border border-border bg-surface px-5 py-[18px]">
              <span className="text-sm font-semibold text-text-muted">{t("today.orders")}</span>
              <span className="text-[30px] font-extrabold">{current.orders.value}</span>
              <Delta kpi={current.orders} vs={t("today.split", { dineIn: current.orders.dineIn, parcel: current.orders.parcel })} format={String} splitStyle />
            </div>
            <div className="flex flex-[1_1_180px] flex-col gap-1 rounded-[18px] border border-border bg-surface px-5 py-[18px]">
              <span className="text-sm font-semibold text-text-muted">{t("today.averageBill")}</span>
              <span className="text-[30px] font-extrabold">{rupees(current.averageBill.value)}</span>
              <Delta kpi={current.averageBill} vs={t(VS_LABEL[range])} format={rupees} />
            </div>
            <div className="flex flex-[1_1_180px] flex-col gap-1 rounded-[18px] border border-border bg-surface px-5 py-[18px]">
              <span className="text-sm font-semibold text-text-muted">{t("today.cancelled")}</span>
              <span className="text-[30px] font-extrabold">{current.cancelled.value}</span>
              <span className="text-[13px] text-text-muted">{t("today.previousCount", { n: current.cancelled.previous, vs: t(VS_LABEL[range]) })}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-[18px]">
            <HourChart byHour={current.byHour} hover={hover} onHover={setHover} />
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-[18px]">
              {current.menuCount > 1 ? (
                <ShareCard
                  title={t("today.byMenu")}
                  rows={current.byMenu.map((row) => ({ key: row.name, name: localName(lang, row.name, row.nameGu), amount: row.amount }))}
                  empty={t("today.noSales")}
                />
              ) : null}
              <ShareCard
                title={t("today.byPayment")}
                rows={current.byPayment.map((row) => ({ key: row.mode, name: t(PAY_LABEL[row.mode]), amount: row.amount }))}
                empty={t("today.noBills")}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-[18px]">
            <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5 rounded-[18px] border border-border bg-surface px-5 py-[18px]">
              <h2 className="text-[17px] font-extrabold">{t(TOP_LABEL[range])}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[380px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs tracking-wide text-text-muted">
                      <th className="py-2 font-bold">{t("today.colDish")}</th>
                      <th className="px-2 py-2 font-bold">{t("today.colMenu")}</th>
                      <th className="px-2 py-2 text-right font-bold">{t("today.colSold")}</th>
                      <th className="py-2 text-right font-bold">{t("today.colSales")}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {current.topDishes.length === 0 ? (
                      <tr className="border-t border-stone-100">
                        <td colSpan={4} className="py-6 text-center text-text-muted">
                          {t("today.noOrders")}
                        </td>
                      </tr>
                    ) : (
                      current.topDishes.map((dish) => (
                        <tr key={`${dish.name}-${dish.menu}`} className="border-t border-stone-100">
                          <td className="py-2.5 font-bold">{localName(lang, dish.name, dish.nameGu)}</td>
                          <td className="px-2 py-2.5 text-text-muted">{dish.menu ? localName(lang, dish.menu, dish.menuGu) : "—"}</td>
                          <td className="px-2 py-2.5 text-right">{dish.quantity}</td>
                          <td className="py-2.5 text-right font-bold">{rupees(dish.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5 rounded-[18px] border border-border bg-surface px-5 py-[18px]">
              <h2 className="text-[17px] font-extrabold">{t("today.lastDays")}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[380px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs tracking-wide text-text-muted">
                      <th className="py-2 font-bold">{t("today.colDay")}</th>
                      <th className="px-2 py-2 text-right font-bold">{t("today.colOrders")}</th>
                      <th className="px-2 py-2 text-right font-bold">{t("today.colSales")}</th>
                      <th className="py-2 text-right font-bold">{t("today.colCancelled")}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {current.lastDays.map((day, index) => (
                      <tr key={day.date} className={`border-t border-stone-100 ${index === 0 ? "bg-orange-50" : ""}`}>
                        <td className={`px-1.5 py-2.5 ${index === 0 ? "font-extrabold" : "font-semibold"}`}>
                          {dayLabel(day.date)}
                          {index === 0 ? ` · ${t("today.todayTag")}` : ""}
                        </td>
                        <td className="px-2 py-2.5 text-right">{day.orders}</td>
                        <td className="px-2 py-2.5 text-right font-bold">{rupees(day.sales)}</td>
                        <td className="px-1.5 py-2.5 text-right">{day.cancelled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}

/** "↑ 6% vs yesterday" — green up, red down; just the old figure when there's nothing to compare. */
function Delta({ kpi, vs, format, splitStyle = false }: { kpi: ReportKpi; vs: string; format: (n: number) => string; splitStyle?: boolean }) {
  const { t } = useI18n();
  if (kpi.previous === 0) {
    return <span className="text-[13px] text-text-muted">{splitStyle ? vs : t("today.previousValue", { value: format(kpi.previous), vs })}</span>;
  }
  const change = Math.round(((kpi.value - kpi.previous) / kpi.previous) * 100);
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] font-bold ${up ? "text-green-700" : "text-red-700"}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {up ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M18 13l-6 6-6-6" />}
      </svg>
      <span className="sr-only">{up ? t("today.up") : t("today.down")}</span>
      {Math.abs(change)}% <span className="font-medium text-text-muted">{splitStyle ? `· ${vs}` : vs}</span>
    </span>
  );
}

function HourChart({ byHour, hover, onHover }: { byHour: number[]; hover: number | null; onHover: (hour: number | null) => void }) {
  const { t } = useI18n();
  const withOrders = byHour.map((n, hour) => (n > 0 ? hour : -1)).filter((hour) => hour >= 0);
  const first = Math.min(11, ...withOrders);
  const last = Math.max(22, ...withOrders);
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const peakValue = Math.max(0, ...hours.map((hour) => byHour[hour]));
  // Four even steps of a whole number of orders: 0–4, 0–8, 0–20…
  const step = Math.max(1, Math.ceil(peakValue / 4));
  const max = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const peak = peakValue > 0 ? hours.find((hour) => byHour[hour] === peakValue)! : null;
  const label12 = (hour: number) => String(hour % 12 === 0 ? 12 : hour % 12);
  const ampm = (hour: number) => (hour < 12 ? "AM" : "PM");
  const shown = hover ?? peak;
  const readout =
    shown === null
      ? t("today.noOrders")
      : `${hover === null ? t("today.busiest") : ""}${label12(shown)} ${ampm(shown)} · ${byHour[shown] === 1 ? t("today.ordersOne") : t("today.ordersN", { n: byHour[shown] })}`;

  return (
    <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5 rounded-[18px] border border-border bg-surface px-5 py-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-extrabold">{t("today.byHour")}</h2>
        <span className="text-sm text-stone-700">{readout}</span>
      </div>
      <div className="relative h-[212px]">
        <div className="absolute inset-x-0 top-0 h-[180px]">
          {ticks.map((value) => {
            const y = Math.round((value / max) * PLOT_HEIGHT);
            return (
              <div key={value}>
                <div className="absolute left-9 right-0" style={{ bottom: y, borderTop: `1px solid ${value === 0 ? "#a8a29e" : "#e7e5e4"}` }} />
                <span className="absolute left-0 w-7 text-right text-[11px] tabular-nums text-text-muted" style={{ bottom: Math.max(0, y - 7) }}>
                  {value}
                </span>
              </div>
            );
          })}
          <div className="absolute bottom-0 left-9 right-0 top-0 flex items-end">
            {hours.map((hour) => {
              const value = byHour[hour];
              const on = hover === hour;
              return (
                <button
                  key={hour}
                  type="button"
                  aria-label={t("today.hourAria", { hour: `${label12(hour)} ${ampm(hour)}`, n: value })}
                  onMouseEnter={() => onHover(hour)}
                  onFocus={() => onHover(hour)}
                  onMouseLeave={() => onHover(null)}
                  onBlur={() => onHover(null)}
                  className={`flex h-full flex-1 cursor-default flex-col items-center justify-end gap-1 rounded-t-md ${on ? "bg-stone-100" : ""}`}
                >
                  {on || hour === peak ? <span className="text-xs font-extrabold">{value}</span> : null}
                  <span className={`w-[22px] max-w-[70%] rounded-t ${on ? "bg-brand-dark" : "bg-brand"}`} style={{ height: value > 0 ? Math.max(2, Math.round((value / max) * PLOT_HEIGHT)) : 0 }} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="absolute left-9 right-0 top-[188px] flex">
          {hours.map((hour) => (
            <span key={hour} className="flex-1 text-center text-[11px] text-text-muted">
              {label12(hour)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShareCard({ title, rows, empty }: { title: string; rows: { key: string; name: string; amount: number }[]; empty: string }) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return (
    <section className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-surface px-5 py-[18px]">
      <h2 className="text-[17px] font-extrabold">{title}</h2>
      {rows.length === 0 || total === 0 ? (
        <p className="text-sm text-text-muted">{empty}</p>
      ) : (
        rows.map((row) => {
          const pct = Math.round((row.amount / total) * 100);
          return (
            <div key={row.key} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-bold">{row.name}</span>
                <span>
                  <strong>{rupees(row.amount)}</strong> <span className="text-text-muted">· {pct}%</span>
                </span>
              </div>
              <div className="h-3 rounded-r bg-brand" style={{ width: `${Math.max(pct, 1)}%` }} />
            </div>
          );
        })
      )}
    </section>
  );
}
