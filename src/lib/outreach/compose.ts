import { escapeHtml } from "@/lib/mail";
import { siteOrigin } from "@/lib/site/urls";

/** The fields of a lead the pitch actually reads. */
export interface Pitchable {
  business: string;
  category: string;
  area: string;
  ownerName?: string | null;
  sessionsInArea?: number | null;
  lang?: "en" | "gu" | null;
}

/** Who the mail is from — HQ's own details, never the product's sending address. */
export interface Sender {
  name: string;
  phone: string;
}

const PRICE = 3000;

function sessions(lead: Pitchable): string {
  return (lead.sessionsInArea || 0).toLocaleString("en-IN");
}

/**
 * A pitch is only honest if its numbers are real: an area with no live
 * restaurants has no audience to sell. The bot refuses to send these rather
 * than rounding a zero up into "thousands of guests".
 */
export function isSendable(lead: Pitchable): boolean {
  return (lead.sessionsInArea || 0) >= 1000;
}

export function subject(lead: Pitchable, followUp: boolean): string {
  if (followUp) return `Re: ${subject(lead, false)}`;
  return lead.lang === "en"
    ? `~${sessions(lead)} guests in ${lead.area} — ₹${PRICE.toLocaleString("en-IN")}/month`
    : `${lead.area} ના ~${sessions(lead)} ગેસ્ટ — મહિને ₹${PRICE.toLocaleString("en-IN")}`;
}

/** The body as plain text. The HTML version is this, escaped and wrapped. */
export function body(lead: Pitchable, sender: Sender, followUp: boolean): string {
  const name = lead.ownerName?.trim() || lead.business;
  if (followUp) {
    return lead.lang === "en"
      ? [
          `Dear ${name},`,
          "",
          `You'll have seen the mail above. The ${lead.category} slot in ${lead.area} is still open.`,
          `If it isn't for you, just reply "no" in one line — I won't write again.`,
          "",
          `${sender.name} · Jamavat · ${sender.phone}`,
        ].join("\n")
      : [
          `નમસ્તે ${name},`,
          "",
          `ઉપરનો મેઇલ જોયો હશે. ${lead.area} માં ${lead.category} ની જગ્યા હજી ખાલી છે.`,
          `રસ ન હોય તો એક લીટીમાં "ના" લખી દેશો — ફરી નહીં લખું. 🙏`,
          "",
          `${sender.name} · જમાવટ · ${sender.phone}`,
        ].join("\n");
  }

  if (lead.lang === "en") {
    return [
      `Dear ${name},`,
      "",
      `I'm ${sender.name} from Jamavat. We run QR ordering in Surat restaurants — guests order from their own phone at the table.`,
      "",
      `After ordering, they sit on one screen for 10–15 minutes waiting for the food. About ${sessions(lead)} guests in ${lead.area} open that screen every month.`,
      "",
      `Your banner goes on that screen. A tap opens your WhatsApp directly.`,
      "",
      `• ₹${PRICE.toLocaleString("en-IN")}/month for one area`,
      `• One ${lead.category} per area — no competitor after you`,
      `• Monthly report: views and clicks`,
      `• No contract, month to month`,
      "",
      `A screenshot is attached showing how your banner would look.`,
      "",
      `Can I call you for two minutes? ${sender.phone}`,
      "",
      `${sender.name} · Jamavat · ${sender.phone} · ${siteOrigin()}`,
    ].join("\n");
  }

  return [
    `નમસ્તે ${name},`,
    "",
    `હું ${sender.name}, જમાવટ માંથી. અમે સુરતના રેસ્ટોરન્ટમાં QR ઓર્ડરિંગ ચલાવીએ છીએ — ગેસ્ટ ટેબલ પર બેસીને પોતાના ફોનથી ઓર્ડર આપે છે.`,
    "",
    `ઓર્ડર આપ્યા પછી જમવાનું આવે ત્યાં સુધી એ ૧૦–૧૫ મિનિટ એક જ સ્ક્રીન પર બેસે છે. ${lead.area} માં મહિને આશરે ${sessions(lead)} ગેસ્ટ એ સ્ક્રીન ખોલે છે.`,
    "",
    `એ સ્ક્રીન પર ${lead.business} નું બેનર મૂકી શકાય. ગેસ્ટ ક્લિક કરે તો સીધો તમારો WhatsApp ખુલે.`,
    "",
    `• મહિને ₹${PRICE.toLocaleString("en-IN")} — એક વિસ્તાર`,
    `• એક વિસ્તારમાં એક જ ${lead.category} — તમારા પછી બીજું કોઈ નહીં`,
    `• દર મહિને રિપોર્ટ — કેટલાએ જોયું, કેટલાએ ક્લિક કર્યું`,
    `• કોઈ કોન્ટ્રાક્ટ નહીં. ન ગમે તો બીજા મહિને બંધ.`,
    "",
    `સ્ક્રીનનો ફોટો સાથે જોડ્યો છે — તમારું બેનર કેવું દેખાશે એ બતાવ્યું છે.`,
    "",
    `બે મિનિટ માટે ફોન કરું? ${sender.phone}`,
    "",
    `${sender.name} · જમાવટ · ${sender.phone} · ${siteOrigin()}`,
  ].join("\n");
}

/**
 * Every mail says how to stop it, in one line, in the language it was
 * written in. A sponsor who can end it in four words replies "ના" instead of
 * pressing Report spam — and one spam report costs the sending address.
 */
export function optOut(lang: "en" | "gu"): string {
  return lang === "en"
    ? `Reply "stop" and you won't hear from me again.`
    : `"બંધ" લખી મોકલશો તો ફરી મેઇલ નહીં આવે.`;
}

/** `pixel` is the open-tracking image URL, or null when tracking is off. */
export function html(text: string, lang: "en" | "gu", pixel?: string | null): string {
  const paragraphs = text
    .split("\n")
    .map((line) => (line ? `<p style="margin:0 0 10px">${escapeHtml(line)}</p>` : ""))
    .join("");
  return [
    `<div style="font-family:system-ui,-apple-system,'Noto Sans Gujarati',sans-serif;font-size:15px;line-height:1.65;color:#1c1917;max-width:560px">`,
    paragraphs,
    `<p style="margin:22px 0 0;font-size:12px;color:#78716c">${escapeHtml(optOut(lang))}</p>`,
    pixel ? `<img src="${escapeHtml(pixel)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">` : "",
    `</div>`,
  ].join("");
}

/**
 * The WhatsApp step opens a normal chat with the text already written — HQ
 * reads it and presses send. It is never sent by the bot: see
 * `lib/outreach/run.ts` for why the Cloud API cannot do this one.
 */
export function whatsappText(lead: Pitchable, sender: Sender): string {
  const name = lead.ownerName?.trim() || lead.business;
  return [
    `નમસ્તે ${name} 🙏 જમાવટ માંથી ${sender.name} બોલું છું.`,
    "",
    `અમે સુરતના રેસ્ટોરન્ટમાં QR મેનુ ચલાવીએ છીએ — ગેસ્ટ પોતાના ફોન પર ઓર્ડર આપે છે. ઓર્ડર આપ્યા પછી જમવાનું આવે ત્યાં સુધી એ ૧૦-૧૫ મિનિટ એક જ સ્ક્રીન પર બેસે છે.`,
    "",
    `${lead.area} માં મહિને ~${sessions(lead)} ગેસ્ટ એ સ્ક્રીન ખોલે છે. ત્યાં ${lead.business} નું બેનર મૂકી શકાય — ક્લિક કરે તો સીધો તમારો WhatsApp ખુલે.`,
    "",
    `મહિને ₹${PRICE.toLocaleString("en-IN")}. એક વિસ્તારમાં એક જ ${lead.category} — તમારા પછી બીજું કોઈ નહીં.`,
    "",
    `બે મિનિટ માટે રૂબરૂ આવું?`,
  ].join("\n");
}

export function whatsappLink(phoneKey: string, text: string): string {
  return `https://wa.me/${phoneKey}?text=${encodeURIComponent(text)}`;
}
