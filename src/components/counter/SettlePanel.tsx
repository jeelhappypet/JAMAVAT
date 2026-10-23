"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { TextField } from "@/components/ui/TextField";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { billTotals, halfPercent } from "@/lib/gst";
import { PAYMENT_MODES, type GstSettingsDTO, type PaymentMode } from "@/types";

export const PAY_LABEL: Record<PaymentMode, MessageKey> = { CASH: "seatBill.cash", UPI: "seatBill.upi", CARD: "seatBill.card" };

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

interface SettlePanelProps {
  itemsTotal: number;
  /** The restaurant's GST setting — off for most, and then nothing is added. */
  gst: GstSettingsDTO;
  discountText: string;
  onDiscountChange: (value: string) => void;
  mode: PaymentMode;
  onModeChange: (mode: PaymentMode) => void;
  /** The address the guest verified this sitting, if they did. */
  email?: string;
  sendEmail: boolean;
  onSendEmailChange: (send: boolean) => void;
  /** Orders on this table a kitchen has not finished — worth saying before money changes hands. */
  stillCooking: number;
  error: string | null;
  settling: boolean;
  onSettle: () => void;
}

/**
 * The right-hand half of a table's bill: what it comes to, what they paid
 * with, whether to email it, and the one button that closes the table.
 *
 * Split out of `SeatBillScreen`, which was 361 lines covering the orders
 * list, this panel, two outcome screens and all the data loading at once.
 */
export function SettlePanel({
  itemsTotal,
  gst,
  discountText,
  onDiscountChange,
  mode,
  onModeChange,
  email,
  sendEmail,
  onSendEmailChange,
  stillCooking,
  error,
  settling,
  onSettle,
}: SettlePanelProps) {
  const { t } = useI18n();
  const discount = Math.max(0, Math.floor(Number(discountText) || 0));
  // Worked out by the same function the settle call uses, so what the counter
  // reads out to the guest is what gets billed.
  const { tax, total: toCollect } = billTotals(itemsTotal, discount, gst);
  const tooMuch = discount > itemsTotal;

  return (
    <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-4">
      <h2 className="text-[17px] font-extrabold">{t("seatBill.settleTitle")}</h2>

      <div className="flex flex-col gap-2 text-[15px]">
        <div className="flex justify-between text-text-muted">
          <span>{t("seatBill.itemsTotal")}</span>
          <span className="tabular-nums">{rupees(itemsTotal)}</span>
        </div>
        <label className="flex items-center justify-between gap-2.5 text-text-muted">
          <span className="shrink-0">{t("seatBill.discount")}</span>
          {/* Sized by this wrapper, not by a width class on the field. The
              field's own base styles include `w-full`, and two unprefixed
              width utilities on one element are settled by stylesheet order —
              so the field was full width and pushed its label onto two lines. */}
          <span className="w-[104px] shrink-0">
            <TextField
              size="sm"
              type="number"
              inputMode="numeric"
              min={0}
              max={itemsTotal}
              value={discountText}
              onChange={(event) => onDiscountChange(event.target.value.replace(/[^\d]/g, "").slice(0, 7))}
              onFocus={(event) => event.target.select()}
              inputClassName="text-right tabular-nums"
            />
          </span>
        </label>
        {tax ? (
          <div className="flex flex-col gap-1.5 border-t border-dashed border-border pt-2 text-text-muted">
            {tax.mode === "CGST_SGST" ? (
              <>
                <div className="flex justify-between">
                  <span>{t("tax.cgst", { p: halfPercent(tax.percent) })}</span>
                  <span className="tabular-nums">{rupees(tax.cgst ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("tax.sgst", { p: halfPercent(tax.percent) })}</span>
                  <span className="tabular-nums">{rupees(tax.sgst ?? 0)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>{t("tax.igst", { p: tax.percent })}</span>
                <span className="tabular-nums">{rupees(tax.amount)}</span>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-0.5 flex items-baseline justify-between border-t border-dashed border-border pt-2.5">
          <span className="text-[15px] font-bold">{t("seatBill.toCollect")}</span>
          <span className="text-[28px] font-extrabold tracking-tight tabular-nums">{rupees(toCollect)}</span>
        </div>
      </div>

      <ChoiceCards
        name="pay"
        legend={t("seatBill.paidBy")}
        value={mode}
        onChange={onModeChange}
        options={PAYMENT_MODES.map((option) => ({ value: option, label: t(PAY_LABEL[option]) }))}
      />

      <div className="flex flex-col gap-2 rounded-[13px] border border-border bg-surface-muted p-3">
        <span className="text-sm font-bold">{t("seatBill.emailTitle")}</span>
        {email ? (
          <div className="flex items-center gap-2.5 text-sm">
            <Checkbox checked={sendEmail} onChange={onSendEmailChange} label={<span className="block truncate">{email}</span>} className="min-w-0 flex-grow items-center" />
            <Badge tone="green" size="sm">
              {t("counter.verified")}
            </Badge>
          </div>
        ) : (
          <span className="text-sm text-text-muted">{t("seatBill.noEmail")}</span>
        )}
        <span className="text-xs text-text-muted">{t("seatBill.emailHint")}</span>
      </div>

      {stillCooking > 0 ? (
        <p className="rounded-[13px] bg-brand-light px-3.5 py-2.5 text-[13px] font-semibold text-brand-dark">
          {stillCooking === 1 ? t("seatBill.stillCookingOne") : t("seatBill.stillCooking", { n: stillCooking })}
        </p>
      ) : null}

      {error ? <Alert>{error}</Alert> : null}

      <Button size="lg" fullWidth onClick={onSettle} disabled={settling || tooMuch}>
        {settling ? t("seatBill.settling") : t("seatBill.settleAction")}
      </Button>
    </aside>
  );
}
