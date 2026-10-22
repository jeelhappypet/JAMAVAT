import { escapeHtml, isMailConfigured, sendMail } from "@/lib/mail";
import type { BillingCycle, SubscriptionPaymentMethod } from "@/types";

const METHOD_LABEL: Record<SubscriptionPaymentMethod, string> = { UPI: "UPI", CASH: "Cash", BANK: "Bank transfer", CARD: "Card", ONLINE: "Online", FREE: "Complimentary" };

const when = (date: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(date);
const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

interface PaymentReceiptInput {
  restaurantName: string;
  amount: number;
  method: SubscriptionPaymentMethod;
  cycle: BillingCycle;
  months: number;
  paidAt: Date;
  paidUntil: Date;
}

/**
 * Receipt emailed to the owner each time HQ records or edits a payment —
 * their proof of what Jamavat charged them. Explicitly not a tax invoice
 * (this app does no GST handling anywhere), same honesty note the guest
 * bill email uses.
 */
export async function sendPaymentReceiptEmail(to: string, input: PaymentReceiptInput): Promise<boolean> {
  if (!isMailConfigured()) return false;
  const name = escapeHtml(input.restaurantName);
  try {
    await sendMail({
      to,
      fromName: "Jamavat",
      subject: `Payment received — ${rupees(input.amount)} for ${input.restaurantName}`,
      text: [
        `Thanks for your payment for ${input.restaurantName} on Jamavat.`,
        "",
        `Amount: ${rupees(input.amount)}`,
        `Paid by: ${METHOD_LABEL[input.method]}`,
        `Period: ${input.months} month${input.months > 1 ? "s" : ""} (${input.cycle === "YEARLY" ? "yearly" : "monthly"} billing)`,
        `Paid on: ${when(input.paidAt)}`,
        `Subscription now runs until: ${when(input.paidUntil)}`,
        "",
        "This is a payment receipt, not a tax invoice.",
      ].join("\n"),
      html: `<div style="font-family:Arial,sans-serif;max-width:460px;margin:auto;padding:24px;color:#1c1917">
  <p style="font-size:17px;font-weight:bold;margin:0 0 10px">Payment received</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 18px">For <strong>${name}</strong> on Jamavat. Keep this for your records.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdfaf7;border:1px solid #ebe2d9;border-radius:14px;margin:0 0 18px">
    <tr><td style="padding:14px 16px;font-size:14px;color:#57534e">Amount</td><td align="right" style="padding:14px 16px;font-size:16px;font-weight:800">${rupees(input.amount)}</td></tr>
    <tr><td style="padding:0 16px 14px;font-size:14px;color:#57534e">Paid by</td><td align="right" style="padding:0 16px 14px;font-size:14px;font-weight:700">${METHOD_LABEL[input.method]}</td></tr>
    <tr><td style="padding:0 16px 14px;font-size:14px;color:#57534e">Period</td><td align="right" style="padding:0 16px 14px;font-size:14px;font-weight:700">${input.months} month${input.months > 1 ? "s" : ""}</td></tr>
    <tr><td style="padding:0 16px 14px;font-size:14px;color:#57534e">Paid on</td><td align="right" style="padding:0 16px 14px;font-size:14px;font-weight:700">${when(input.paidAt)}</td></tr>
    <tr><td style="padding:0 16px 14px;font-size:14px;color:#57534e">Subscription until</td><td align="right" style="padding:0 16px 14px;font-size:14px;font-weight:700">${when(input.paidUntil)}</td></tr>
  </table>
  <p style="font-size:12px;color:#78716c;margin:0">This is a payment receipt, not a tax invoice.</p>
</div>`,
    });
    return true;
  } catch (error) {
    console.error("[hq] payment receipt email failed", error);
    return false;
  }
}
