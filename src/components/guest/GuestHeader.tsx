"use client";

import type { ReactNode } from "react";
import { RestaurantInitial } from "@/components/brand/BrandMark";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface GuestHeaderProps {
  restaurantName: string;
  /** Second line under the title. */
  subtitle?: string;
  /** Replaces the restaurant name (e.g. "Your order"). */
  title?: string;
  onBack?: () => void;
  trailing?: ReactNode;
}

export function GuestHeader({ restaurantName, subtitle, title, onBack, trailing }: GuestHeaderProps) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 flex shrink-0 items-center gap-2.5 border-b border-border bg-surface px-4 py-3">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label={t("guest.back")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5" />
            <path d="m11 6-6 6 6 6" />
          </svg>
        </button>
      ) : (
        <RestaurantInitial name={restaurantName} size={42} solid />
      )}
      <div className="flex min-w-0 flex-grow flex-col">
        <span className="truncate text-[17px] font-extrabold tracking-tight">{title ?? restaurantName}</span>
        {subtitle ? <span className="truncate text-[13px] text-text-muted">{subtitle}</span> : null}
      </div>
      {trailing ?? <LanguageToggle />}
    </header>
  );
}
