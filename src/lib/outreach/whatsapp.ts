import { getSendConfig, type WhatsAppSendConfig } from "@/lib/whatsapp/config";
import { sendTemplateMessage, type SendResult } from "@/lib/whatsapp/graph";
import type { Pitchable } from "./compose";

/**
 * The outreach bot's WhatsApp sending.
 *
 * A business that has never messaged Jamavat is outside the 24-hour window,
 * so a plain text message is refused by Meta with 131047. The only thing that
 * reaches them is an **approved marketing template**, which is what this
 * sends.
 *
 * Two things follow from that, and both are built in below:
 *
 * - The template's wording is fixed by Meta's approval. The pitch cannot be
 *   rewritten per lead — only the {{1}}…{{4}} placeholders change. So the
 *   text here must match `WHATSAPP_OUTREACH_TEMPLATE`'s approved body
 *   exactly, or the send comes back as a 132xxx.
 * - Marketing templates to people who never opted in are what drops a
 *   number's quality rating, and a restricted number stops the restaurants'
 *   own chats too. `WHATSAPP_OUTREACH_PHONE_NUMBER_ID` lets outreach run on a
 *   second number so that blast radius never reaches the one HQ supports
 *   restaurants on. The daily cap below is the other half.
 *
 *   There is only one real number on this account today (+91 97145 89772),
 *   so outreach and support share it by the owner's decision. That is what
 *   `WHATSAPP_OUTREACH_ALLOW_SHARED_NUMBER` records: not an oversight, a
 *   choice, and one to revisit the moment a second SIM exists. Watch the
 *   number's quality rating in WhatsApp Manager — GREEN today; at YELLOW,
 *   stop and get the second number.
 */

/** The template body as approved, with its placeholders. Keep this and Meta in step. */
export const TEMPLATE_BODY = [
  "નમસ્તે {{1}} 🙏 જમાવટ માંથી.",
  "",
  "અમે સુરતના રેસ્ટોરન્ટમાં QR મેનુ ચલાવીએ છીએ — ગેસ્ટ પોતાના ફોનથી ઓર્ડર આપે છે, અને જમવાનું આવે ત્યાં સુધી ૧૦-૧૫ મિનિટ એક જ સ્ક્રીન પર બેસે છે.",
  "",
  "{{2}} માં મહિને આશરે {{3}} ગેસ્ટ એ સ્ક્રીન ખોલે છે. ત્યાં તમારું બેનર મૂકી શકાય — ક્લિક કરે તો સીધો તમારો WhatsApp ખુલે.",
  "",
  "મહિને ₹3,000. એક વિસ્તારમાં એક જ {{4}} — તમારા પછી બીજું કોઈ નહીં.",
  "",
  "રસ હોય તો જવાબ આપો. ન હોય તો \"બંધ\" લખી દેશો, ફરી મેસેજ નહીં કરું.",
].join("\n");

export type OutreachWaProblem = "unset" | "no-template" | "shared-number";

/** Why the bot cannot WhatsApp, or null when it can. */
export function whatsappProblem(): OutreachWaProblem | null {
  if (!getSendConfig()) return "unset";
  if (!process.env.WHATSAPP_OUTREACH_TEMPLATE?.trim()) return "no-template";
  const outreach = process.env.WHATSAPP_OUTREACH_PHONE_NUMBER_ID?.trim();
  if (!outreach) return "shared-number";
  // Pointing it at the support number defeats the point, so it only passes
  // when the owner has said in so many words that they accept that.
  const shared = outreach === process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (shared && process.env.WHATSAPP_OUTREACH_ALLOW_SHARED_NUMBER?.trim() !== "true") return "shared-number";
  return null;
}

/**
 * The config to send outreach on. Falls back to the support number when no
 * separate one is set — the caller decides whether to allow that, because the
 * risk is Meta restricting the number every restaurant talks to HQ on.
 */
export function outreachConfig(): WhatsAppSendConfig | null {
  const base = getSendConfig();
  if (!base) return null;
  const chosen = process.env.WHATSAPP_OUTREACH_PHONE_NUMBER_ID?.trim();
  return chosen ? { ...base, phoneNumberId: chosen } : base;
}

/**
 * Its own cap, separate from email's. WhatsApp punishes volume harder: Meta
 * scores the number on how many people block or report it, and a tier drop
 * is far slower to undo than a mail going to spam.
 */
export function whatsappDailyCap(): number {
  return Number(process.env.WHATSAPP_OUTREACH_DAILY_CAP || 20);
}

/** The placeholders, in the order the approved template uses them. */
export function templateParams(lead: Pitchable): string[] {
  return [
    lead.ownerName?.trim() || lead.business,
    lead.area,
    (lead.sessionsInArea || 0).toLocaleString("en-IN"),
    lead.category,
  ];
}

/** The message as the sponsor will read it — for HQ's thread, before and after it is sent. */
export function renderTemplate(lead: Pitchable): string {
  return templateParams(lead).reduce((text, value, index) => text.replaceAll(`{{${index + 1}}}`, value), TEMPLATE_BODY);
}

export async function sendOutreachWhatsApp(lead: Pitchable, to: string): Promise<SendResult> {
  const config = outreachConfig();
  if (!config) return { ok: false, reason: "auth" };
  const name = process.env.WHATSAPP_OUTREACH_TEMPLATE?.trim();
  if (!name) return { ok: false, reason: "template" };
  return sendTemplateMessage(config, to, {
    name,
    language: process.env.WHATSAPP_OUTREACH_TEMPLATE_LANG?.trim() || "gu",
    params: templateParams(lead),
  });
}
