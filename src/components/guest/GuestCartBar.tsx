"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

/**
 * The bar pinned to the bottom of the guest's menu: what's in the cart and
 * the way to it, or — with nothing added yet — the one thing a guest at a
 * table wants to know, which is that they pay at the counter afterwards.
 *
 * Its own component rather than markup inside the menu screen: it is a
 * two-line button with a shadow, which `Button` deliberately can't be
 * (`justify-center` on its base would fight a `justify-between` passed from
 * outside, and unprefixed utilities are settled by stylesheet order, not by
 * the caller — see CLAUDE.md).
 */
export function GuestCartBar({ count, total, onOpen }: { count: number; total: number; onOpen: () => void }) {
  const { t } = useI18n();

  return (
    // max() keeps the bar clear of the home indicator when the guest page runs as an installed app.
    <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30">
      {count > 0 ? (
        <button
          type="button"
          onClick={onOpen}
          className="animate-line-in flex min-h-[60px] w-full items-center justify-between gap-3 rounded-2xl bg-brand px-[18px] py-3 text-white shadow-[0_10px_24px_rgba(154,52,18,0.32)] transition-colors active:bg-brand-dark"
        >
          <span className="flex flex-col items-start">
            <span className="text-[13px] font-semibold">{count === 1 ? t("guest.itemsOne") : t("guest.items", { n: count })}</span>
            <span className="text-[19px] font-extrabold">₹{total}</span>
          </span>
          <span className="flex items-center gap-1.5 text-base font-extrabold">
            {t("guest.viewCart")}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-text-muted shadow-sm">
          <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M3 10h18" />
          </svg>
          {t("guest.payNote")}
        </div>
      )}
    </div>
  );
}
