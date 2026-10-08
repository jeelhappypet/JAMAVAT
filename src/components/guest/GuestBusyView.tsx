"use client";

import { GuestHeader } from "@/components/guest/GuestHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { GuestStateDTO } from "@/types";

/** "5 · Same QR on a 2nd phone" artboard. */
export function GuestBusyView({ restaurantName, state, onBrowse }: { restaurantName: string; state: GuestStateDTO; onBrowse: () => void }) {
  const { t } = useI18n();
  const subtitle = [t("guest.table", { code: state.seatCode }), state.area].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-full w-full max-w-[480px] flex-col bg-background">
      <GuestHeader restaurantName={restaurantName} subtitle={subtitle} />
      <main className="flex flex-1 flex-col items-center gap-[18px] px-6 pb-6 pt-10 text-center">
        <span className="flex h-[84px] w-[84px] items-center justify-center rounded-[26px] bg-brand-light text-brand">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" />
          </svg>
        </span>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{t("guest.busyTitle")}</h1>
        <p className="max-w-[320px] text-[15px] leading-relaxed text-text-muted">{t("guest.busyBody", { code: state.seatCode })}</p>
        <div className="mt-2 flex w-full flex-col gap-2.5 text-left">
          {state.otherSeats.length > 0 ? (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
              <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted px-1 text-sm font-extrabold">{state.otherSeats[0]}</span>
              <span className="text-sm leading-relaxed text-stone-700">
                <strong className="text-foreground">{t("guest.busyOtherSide")}</strong>
                <br />
                {t("guest.busyOtherSideBody", { codes: state.otherSeats.join(", ") })}
              </span>
            </div>
          ) : null}
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </span>
            <span className="text-sm leading-relaxed text-stone-700">
              <strong className="text-foreground">{t("guest.busyYours")}</strong>
              <br />
              {t("guest.busyYoursBody")}
            </span>
          </div>
        </div>
      </main>
      <div className="sticky bottom-0 border-t border-border bg-surface px-4 pb-4 pt-3">
        <button type="button" onClick={onBrowse} className="flex h-[54px] w-full items-center justify-center rounded-[14px] border-[1.5px] border-stone-300 text-base font-bold">
          {t("guest.justBrowse")}
        </button>
      </div>
    </div>
  );
}
