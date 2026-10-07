"use client";

import { GuestHeader } from "@/components/guest/GuestHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function InvalidQr({ restaurantName }: { restaurantName: string }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-full w-full max-w-[480px] flex-col bg-background">
      <GuestHeader restaurantName={restaurantName} />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-light text-brand">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="m14 14 7 7M21 14l-7 7" />
          </svg>
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight">{t("guest.invalidTitle")}</h1>
        <p className="max-w-[300px] text-[15px] leading-relaxed text-text-muted">{t("guest.invalidBody")}</p>
      </main>
    </div>
  );
}
