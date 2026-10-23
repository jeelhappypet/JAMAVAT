import { describe, expect, it } from "vitest";
import { billNumber, renderBillEmail, rupees } from "@/lib/billEmail";

const noGst = { enabled: false, percent: 0, mode: "CGST_SGST" } as const;
const restaurant = { name: "Guru <Krupa>", address: "Main road", phone: "98765 43210", reviewUrl: "https://g.page/r/test", gst: noGst };

const email = (over: Partial<Parameters<typeof renderBillEmail>[0]> = {}) =>
  renderBillEmail({
    restaurant,
    billNo: 7,
    seatCode: "4A",
    settledAt: new Date("2026-10-08T14:30:00Z"),
    lines: [
      { name: "Gujarati Thali", quantity: 2, amount: 400 },
      { name: "Chaas", quantity: 1, amount: 30 },
    ],
    itemsTotal: 430,
    discount: 30,
    total: 400,
    paymentMode: "UPI",
    ...over,
  });

describe("bill email", () => {
  it("formats money and bill numbers", () => {
    expect(rupees(125000)).toBe("₹1,25,000");
    expect(billNumber(7)).toBe("0007");
  });

  it("escapes the restaurant name in the HTML", () => {
    const { html } = email();
    expect(html).toContain("Guru &lt;Krupa&gt;");
    expect(html).not.toContain("Guru <Krupa>");
  });

  it("shows lines, discount, total, table and payment", () => {
    const { html, text, subject } = email();
    expect(subject).toContain("₹400");
    expect(html).toContain("0007");
    for (const part of ["Gujarati Thali", "× 2", "₹400", "₹30", "4A"]) expect(html).toContain(part);
    expect(text).toContain("UPI");
    expect(html).toContain("https://g.page/r/test");
  });

  it("prints the time in India, with capital AM/PM", () => {
    expect(email().html).toMatch(/8:00\s?PM/);
  });

  it("says it is only a summary when GST is off", () => {
    const { html, text } = email();
    expect(html).toContain("not a tax invoice");
    expect(text).toContain("not a tax invoice");
    expect(html).not.toContain("CGST");
  });

  it("splits CGST and SGST, and adds them to the total paid", () => {
    const tax = { percent: 5, mode: "CGST_SGST", amount: 20, cgst: 10, sgst: 10 } as const;
    const { html, text } = email({ tax, total: 420 });
    expect(html).toContain("CGST 2.5%");
    expect(html).toContain("SGST 2.5%");
    expect(text).toContain("CGST 2.5% ₹10");
    expect(html).toContain("₹420");
  });

  it("shows IGST as one line", () => {
    const { html } = email({ tax: { percent: 5, mode: "IGST", amount: 20 }, total: 420 });
    expect(html).toContain("IGST 5%");
    expect(html).not.toContain("CGST");
  });

  it("only calls itself a tax invoice once the GSTIN is there", () => {
    const tax = { percent: 5, mode: "IGST", amount: 20 } as const;
    const withoutNumber = email({ tax, total: 420 });
    expect(withoutNumber.html).toContain("not a tax invoice");

    const gst = { enabled: true, percent: 5, mode: "IGST", gstin: "24AAAAA0000A1Z5" } as const;
    const withNumber = email({ tax, total: 420, restaurant: { ...restaurant, gst } });
    expect(withNumber.html).toContain("GSTIN 24AAAAA0000A1Z5");
    expect(withNumber.html).toContain("Tax invoice");
    expect(withNumber.html).not.toContain("not a tax invoice");
    expect(withNumber.text).toContain("Tax invoice · GSTIN 24AAAAA0000A1Z5");
  });
});
