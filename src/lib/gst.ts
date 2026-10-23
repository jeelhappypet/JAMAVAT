import type { BillTaxDTO, GstSettingsDTO } from "@/types";

/**
 * The one place GST is worked out, so the counter screen, the stored bill and
 * the emailed invoice can never disagree about what a guest owes.
 *
 * Jamavat keeps money in whole rupees everywhere (`₹` + `toLocaleString`), so
 * the tax is rounded to rupees too. With CGST+SGST each half is rounded on
 * its own and the total is the two halves added up — that way the invoice's
 * three numbers always agree, which they would not if the total were rounded
 * separately (₹105 at 5% → 2.625 twice: 3 + 3 = 6, not 5).
 */
export function billTax(taxable: number, gst: GstSettingsDTO | undefined | null): BillTaxDTO | undefined {
  if (!gst?.enabled || !(gst.percent > 0) || taxable <= 0) return undefined;
  if (gst.mode === "IGST") {
    return { percent: gst.percent, mode: "IGST", amount: Math.round((taxable * gst.percent) / 100) };
  }
  const half = Math.round((taxable * gst.percent) / 200);
  return { percent: gst.percent, mode: "CGST_SGST", amount: half * 2, cgst: half, sgst: half };
}

/** Items − discount, then tax on top: what the counter collects. */
export function billTotals(itemsTotal: number, discount: number, gst: GstSettingsDTO | undefined | null) {
  const taxable = Math.max(0, itemsTotal - discount);
  const tax = billTax(taxable, gst);
  return { taxable, tax, total: taxable + (tax?.amount ?? 0) };
}

/** Half the rate for a CGST/SGST label ("CGST 2.5%"); trailing ".0" dropped. */
export function halfPercent(percent: number): number {
  return Math.round((percent / 2) * 100) / 100;
}
