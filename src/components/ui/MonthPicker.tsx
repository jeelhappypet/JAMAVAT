"use client";

import { IconButton } from "./IconButton";
import { useI18n } from "@/lib/i18n/I18nProvider";

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

/** ‹ October 2026 › — value is YYYY-MM; can't go past `max`. */
export function MonthPicker({ value, onChange, max }: { value: string; onChange: (month: string) => void; max?: string }) {
  const { t, lang } = useI18n();
  const label = new Intl.DateTimeFormat(lang === "gu" ? "gu-IN" : "en-IN", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${value}-01T00:00:00Z`));
  return (
    <div className="flex items-center gap-2">
      <IconButton label={t("reports.prevMonth")} size="md" onClick={() => onChange(shiftMonth(value, -1))}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 6-6 6 6 6" />
        </svg>
      </IconButton>
      <span className="min-w-[150px] text-center text-base font-extrabold">{label}</span>
      <IconButton label={t("reports.nextMonth")} size="md" disabled={max !== undefined && value >= max} onClick={() => onChange(shiftMonth(value, 1))}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 6 6 6-6 6" />
        </svg>
      </IconButton>
    </div>
  );
}
