import { escapeHtml } from "@/lib/mail";
import { halfPercent } from "@/lib/gst";
import type { BillLineDTO, BillTaxDTO, PaymentMode, RestaurantSettingsDTO } from "@/types";

interface BillEmailInput {
  restaurant: RestaurantSettingsDTO;
  billNo: number;
  seatCode: string;
  settledAt: Date;
  lines: BillLineDTO[];
  itemsTotal: number;
  discount: number;
  /** Set only when the restaurant has GST switched on. */
  tax?: BillTaxDTO;
  total: number;
  paymentMode: PaymentMode;
}

const PAID_BY: Record<PaymentMode, string> = { CASH: "cash", UPI: "UPI", CARD: "card" };

export const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
export const billNumber = (billNo: number) => String(billNo).padStart(4, "0");

const when = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    .format(date)
    .replace(/\b(am|pm)\b/, (meridiem) => meridiem.toUpperCase());

/**
 * The thank-you email from the "6 · Thank-you email" artboard. Table layout
 * and inline styles only — that's what Gmail, Outlook and phone mail apps
 * render reliably.
 *
 * With GST switched off it is an order summary and says so. With GST on it
 * carries the tax lines, and it only calls itself a tax invoice once the
 * restaurant has put its GSTIN in Settings — an invoice without the number on
 * it isn't one, and claiming otherwise in a guest's inbox would be a lie the
 * restaurant has to answer for.
 */
export function renderBillEmail(input: BillEmailInput): { subject: string; html: string; text: string; fromName: string } {
  const { restaurant, lines } = input;
  const name = escapeHtml(restaurant.name);
  const initial = escapeHtml(restaurant.name.trim().charAt(0).toUpperCase() || "J");
  const font = "'Plus Jakarta Sans','Segoe UI',Helvetica,Arial,sans-serif";
  const muted = "#57534e";

  const rows = lines
    .map(
      (line, index) => `
        <tr>
          <td style="padding:10px 0;font-size:15px;color:#1c1917;border-bottom:1px solid ${index === lines.length - 1 ? "#ebe2d9" : "#f5f5f4"}">${escapeHtml(line.name)} <span style="color:${muted}">× ${line.quantity}</span></td>
          <td align="right" style="padding:10px 0;font-size:15px;font-weight:700;color:#1c1917;border-bottom:1px solid ${index === lines.length - 1 ? "#ebe2d9" : "#f5f5f4"}">${rupees(line.amount)}</td>
        </tr>`
    )
    .join("");

  // CGST and SGST on their own lines, IGST on one — the way a guest's
  // accountant expects to read it.
  const taxRow = (label: string, amount: number) =>
    `<tr><td style="padding:4px 0 10px;font-size:14px;color:${muted}">${label}</td><td align="right" style="padding:4px 0 10px;font-size:14px;color:${muted}">${rupees(amount)}</td></tr>`;
  const tax = input.tax;
  const taxRows = !tax
    ? ""
    : tax.mode === "CGST_SGST"
      ? taxRow(`CGST ${halfPercent(tax.percent)}%`, tax.cgst ?? 0) + taxRow(`SGST ${halfPercent(tax.percent)}%`, tax.sgst ?? 0)
      : taxRow(`IGST ${tax.percent}%`, tax.amount);
  const isTaxInvoice = Boolean(tax && restaurant.gst.gstin);

  const footerRaw = [restaurant.name, restaurant.address, restaurant.phone].filter(Boolean).join(" · ");
  const footerBits = escapeHtml(footerRaw);

  const review = restaurant.reviewUrl
    ? `
      <tr><td style="padding:0 32px 24px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:16px">
          <tr><td align="center" style="padding:20px;font-family:${font}">
            <div style="font-size:16px;font-weight:800;color:#1c1917">Enjoyed the food?</div>
            <div style="padding-top:8px;font-size:14px;color:#44403c">A quick Google review helps other food lovers find us.</div>
            <div style="padding-top:12px"><a href="${escapeHtml(restaurant.reviewUrl)}" style="display:inline-block;padding:13px 22px;border-radius:12px;background:#b2560a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800">Rate us on Google</a></div>
          </td></tr>
        </table>
      </td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thank you</title></head>
<body style="margin:0;padding:0;background:#f5f5f4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #ebe2d9;border-radius:20px;overflow:hidden;font-family:${font};color:#1c1917">
      <tr><td style="background:#b2560a;padding:28px 32px;color:#ffffff">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:42px;height:42px;border-radius:12px;background:#ffffff;color:#b2560a;font-size:19px;font-weight:800;text-align:center;vertical-align:middle">${initial}</td>
          <td style="padding-left:10px;font-size:20px;font-weight:800;color:#ffffff">${name}</td>
        </tr></table>
        <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;color:#ffffff">Thank you for dining with us!</h1>
        <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#ffffff">We hope you enjoyed your meal. Here are the details of today's bill. See you again soon.</p>
      </td></tr>
      <tr><td style="padding:24px 32px 18px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdfaf7;border:1px solid #ebe2d9;border-radius:14px">
          <tr>
            <td style="vertical-align:top;padding:14px 16px;width:33%"><div style="font-size:12px;color:${muted}">Bill no.</div><div style="font-size:15px;font-weight:800">${billNumber(input.billNo)}</div></td>
            <td style="vertical-align:top;padding:14px 8px;width:33%"><div style="font-size:12px;color:${muted}">Table</div><div style="font-size:15px;font-weight:800">${escapeHtml(input.seatCode)}</div></td>
            <td style="vertical-align:top;padding:14px 16px"><div style="font-size:12px;color:${muted}">Date</div><div style="font-size:15px;font-weight:800">${when(input.settledAt)}</div></td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 24px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;color:${muted};border-bottom:1px solid #ebe2d9">ITEM</td>
            <td align="right" style="padding:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;color:${muted};border-bottom:1px solid #ebe2d9">AMOUNT</td>
          </tr>
          ${rows}
          <tr><td style="padding:10px 0 4px;font-size:14px;color:${muted}">Items total</td><td align="right" style="padding:10px 0 4px;font-size:14px;color:${muted}">${rupees(input.itemsTotal)}</td></tr>
          <tr><td style="padding:4px 0 10px;font-size:14px;color:${muted}">Discount</td><td align="right" style="padding:4px 0 10px;font-size:14px;color:${muted}">${rupees(input.discount)}</td></tr>
          ${taxRows}
          <tr>
            <td style="padding-top:12px;border-top:1px dashed #d6d3d1;font-size:16px;font-weight:800">Total paid</td>
            <td align="right" style="padding-top:12px;border-top:1px dashed #d6d3d1;font-size:26px;font-weight:800">${rupees(input.total)}</td>
          </tr>
          <tr><td></td><td align="right" style="padding-top:4px;font-size:13px;color:${muted}">Paid by ${PAID_BY[input.paymentMode]} at the counter</td></tr>
        </table>
      </td></tr>
      ${review}
      <tr><td style="padding:18px 32px 24px;border-top:1px solid #ebe2d9;font-size:12px;line-height:1.6;color:${muted}">
        <div>${footerBits}</div>
        ${isTaxInvoice ? `<div style="padding-top:6px">GSTIN ${escapeHtml(restaurant.gst.gstin!)}</div>` : ""}
        <div style="padding-top:6px">${isTaxInvoice ? "Tax invoice" : "This is an order summary, not a tax invoice"}. You received it because you verified this email at table ${escapeHtml(input.seatCode)}.</div>
        <div style="padding-top:6px">Sent with <strong style="color:#1c1917">Jamavat</strong> — QR ordering for restaurants</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    `Thank you for dining with us at ${restaurant.name}!`,
    "",
    `Bill no. ${billNumber(input.billNo)} · Table ${input.seatCode} · ${when(input.settledAt)}`,
    "",
    ...lines.map((line) => `${line.name} × ${line.quantity}  ${rupees(line.amount)}`),
    "",
    `Items total ${rupees(input.itemsTotal)}`,
    `Discount ${rupees(input.discount)}`,
    ...(!tax
      ? []
      : tax.mode === "CGST_SGST"
        ? [`CGST ${halfPercent(tax.percent)}% ${rupees(tax.cgst ?? 0)}`, `SGST ${halfPercent(tax.percent)}% ${rupees(tax.sgst ?? 0)}`]
        : [`IGST ${tax.percent}% ${rupees(tax.amount)}`]),
    `Total paid ${rupees(input.total)} (paid by ${PAID_BY[input.paymentMode]} at the counter)`,
    ...(restaurant.reviewUrl ? ["", `Enjoyed the food? Rate us on Google: ${restaurant.reviewUrl}`] : []),
    "",
    isTaxInvoice ? `Tax invoice · GSTIN ${restaurant.gst.gstin}` : "This is an order summary, not a tax invoice.",
    footerRaw,
  ].join("\n");

  return {
    subject: `Thank you for dining at ${restaurant.name} — your bill (${rupees(input.total)})`,
    html,
    text,
    fromName: `${restaurant.name} via Jamavat`,
  };
}
