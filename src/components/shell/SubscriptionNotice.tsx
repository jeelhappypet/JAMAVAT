"use client";

import { Alert } from "@/components/ui/Alert";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { SubscriptionState } from "@/types";

export interface SubscriptionNoticeProps {
  state: SubscriptionState;
  /** Days until the period ends — negative once it has passed. */
  daysLeft: number | null;
  paidUntil?: string;
  graceDays: number;
}

/**
 * The one place a restaurant hears about its own subscription: a line above
 * the screens in the week before it ends, and a louder one once it has.
 * Nothing at all while everything is fine — an owner shouldn't be nagged
 * through a normal service.
 */
export function SubscriptionNotice({ state, daysLeft, paidUntil, graceDays }: SubscriptionNoticeProps) {
  const { t, lang } = useI18n();
  if (state === "suspended" || state === "cancelled") {
    return <Alert tone="error">{t("err.restaurantPaused")}</Alert>;
  }

  const date = paidUntil ? new Date(paidUntil).toLocaleDateString(lang === "gu" ? "gu-IN" : "en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "";

  if (state === "expired") return <Alert tone="error">{t("sub.expired")}</Alert>;
  if (state === "due") {
    const left = Math.max(0, graceDays + (daysLeft ?? 0));
    return (
      <Alert tone="warning">
        {t("sub.overdue", { date, n: left })} {t("sub.renew")}
      </Alert>
    );
  }
  if (daysLeft === null || daysLeft > 7) return null;

  return (
    <Alert tone="warning">
      {daysLeft <= 0 ? t("sub.endsToday", { date }) : t("sub.endsIn", { n: daysLeft, date })} {t("sub.renew")}
    </Alert>
  );
}
