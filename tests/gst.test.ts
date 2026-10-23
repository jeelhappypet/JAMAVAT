import { describe, expect, it } from "vitest";
import { billTax, billTotals, halfPercent } from "@/lib/gst";

const off = { enabled: false, percent: 5, mode: "CGST_SGST" } as const;
const split = { enabled: true, percent: 5, mode: "CGST_SGST" } as const;
const igst = { enabled: true, percent: 5, mode: "IGST" } as const;

describe("bill tax", () => {
  it("adds nothing at all when GST is off", () => {
    expect(billTax(1000, off)).toBeUndefined();
    expect(billTotals(430, 30, off)).toEqual({ taxable: 400, tax: undefined, total: 400 });
  });

  it("adds nothing when the rate is 0, or the bill is", () => {
    expect(billTax(1000, { enabled: true, percent: 0, mode: "IGST" })).toBeUndefined();
    expect(billTax(0, split)).toBeUndefined();
  });

  it("splits the rate in half for CGST + SGST", () => {
    expect(billTax(1000, split)).toEqual({ percent: 5, mode: "CGST_SGST", amount: 50, cgst: 25, sgst: 25 });
  });

  it("shows IGST as one line at the full rate", () => {
    expect(billTax(1000, igst)).toEqual({ percent: 5, mode: "IGST", amount: 50 });
  });

  it("keeps the two halves adding up to the total, even when they round", () => {
    // 105 at 5% is 2.625 a half: both round to 3, so the invoice reads 3 + 3 = 6.
    const tax = billTax(105, split)!;
    expect(tax.cgst! + tax.sgst!).toBe(tax.amount);
    expect(tax.amount).toBe(6);
  });

  it("taxes what is left after the discount, not the items total", () => {
    expect(billTotals(1000, 200, igst)).toEqual({ taxable: 800, tax: { percent: 5, mode: "IGST", amount: 40 }, total: 840 });
  });

  it("never goes negative when the discount is the whole bill", () => {
    expect(billTotals(300, 300, split)).toEqual({ taxable: 0, tax: undefined, total: 0 });
  });

  it("labels half rates without a trailing zero", () => {
    expect(halfPercent(5)).toBe(2.5);
    expect(halfPercent(18)).toBe(9);
  });
});
