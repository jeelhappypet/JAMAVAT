"use client";

import { Card } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { SubscriptionState } from "@/types";

export interface PlanCardProps {
  planName?: string;
  state: SubscriptionState;
  isTrial: boolean;
  paidUntil?: string;
  maxSeats?: number;
  maxStaff?: number;
  usedSeats: number;
  usedStaff: number;
}

/** What this restaurant is paying for, where it stands, and how much of its plan it is using. */
export function PlanCard({ planName, isTrial, paidUntil, maxSeats, maxStaff, usedSeats, usedStaff }: PlanCardProps) {
  const { t, lang } = useI18n();
  const date = paidUntil
    ? new Date(paidUntil).toLocaleDateString(lang === "gu" ? "gu-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    : null;
  const limited = maxSeats !== undefined || maxStaff !== undefined;

  return (
    <Card className="flex max-w-[640px] flex-col gap-1.5">
      <h2 className="text-[17px] font-extrabold">{t("sub.planTitle")}</h2>
      <p className="text-[15px] font-bold">
        {planName ?? t("sub.planNone")}
        {isTrial ? ` · ${t("sub.trial")}` : ""}
      </p>
      <p className="text-[15px] text-text-muted">{date ? t("sub.until", { date }) : t("sub.noEnd")}</p>
      <p className="text-[13px] text-text-muted">
        {limited
          ? `${t("sub.limits", { seats: maxSeats ?? "∞", staff: maxStaff ?? "∞" })} · ${usedSeats} / ${usedStaff} in use`
          : t("sub.limitsUnlimited")}
      </p>
    </Card>
  );
}
