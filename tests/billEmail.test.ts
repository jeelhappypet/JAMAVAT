import { describe, expect, it } from "vitest";
import { billNumber, renderBillEmail, rupees } from "@/lib/billEmail";

const restaurant = { name: "Guru <Krupa>", address: "Main road", phone: "98765 43210", reviewUrl: "https://g.page/r/test" };

const email = () =>
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
});
