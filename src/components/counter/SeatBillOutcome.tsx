"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { PAY_LABEL } from "@/components/counter/SettlePanel";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useAppPath } from "@/components/shell/RestaurantProvider";
import type { BillDTO } from "@/types";

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-2.5 rounded-[18px] border border-border bg-surface p-7 text-center motion-safe:animate-line-in">
      {children}
    </section>
  );
}

/** The table is paid and free again. Shown for a few seconds, then the counter goes back to the seats. */
export function SettledCard({ bill }: { bill: BillDTO }) {
  const path = useAppPath();
  const { t } = useI18n();
  return (
    <Card>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-light text-success">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <h1 className="text-xl font-extrabold">{t("seatBill.settledTitle", { code: bill.seatCode })}</h1>
      <p className="text-[15px] text-text-muted">
        {t("seatBill.settledBody", { no: String(bill.billNo).padStart(4, "0"), total: rupees(bill.total), mode: t(PAY_LABEL[bill.paymentMode]) })}
      </p>
      <p className="text-sm font-semibold text-text-muted">
        {bill.emailStatus === "SENT" ? t("seatBill.emailSent", { email: bill.email ?? "" }) : bill.emailStatus === "FAILED" ? t("seatBill.emailFailed") : t("seatBill.emailSkipped")}
      </p>
      <Button href={path("/counter")} size="md" className="mt-1.5">
        {t("seatBill.backToSeats")}
      </Button>
    </Card>
  );
}

/** Someone opened a seat that nobody is sitting at — or that was settled from another device a moment ago. */
export function FreeSeatCard({ code, message }: { code: string; message?: string }) {
  const path = useAppPath();
  const { t } = useI18n();
  return (
    <Card>
      <h1 className="text-lg font-extrabold">{t("seatBill.freeTitle", { code })}</h1>
      <p className="text-[15px] text-text-muted">{message ?? t("seatBill.freeBody")}</p>
      <Button href={path("/counter")} variant="secondary" size="md" className="mt-1.5">
        {t("seatBill.backToSeats")}
      </Button>
    </Card>
  );
}
