import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Email open tracking: a 1×1 image at the bottom of the mail, whose URL names
 * the lead and the step. The image being fetched is the only signal an email
 * can give back, and HQ's thread shows it as "seen" with that caveat.
 *
 * **It is a guess, not a receipt.** Read it that way:
 *
 * - Gmail fetches images through its own proxy, often before the person has
 *   opened anything, so an open can be the mail arriving rather than being
 *   read. Apple Mail's privacy protection does the same, on purpose.
 * - A client with images off never reports an open at all, so someone who
 *   read the mail properly can show as unseen forever.
 * - Nothing marks a *reply*. Only the person can do that in HQ.
 *
 * WhatsApp is the opposite: its delivered and read ticks come from Meta's
 * webhook and are exact. That is why the thread labels the two differently.
 *
 * The URL is signed, so an id in a forwarded mail cannot be used to mark
 * other leads as read, and a wrong guess just 404s.
 */

/** A 1×1 transparent GIF — smaller than a PNG and every client renders it. */
export const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function secret(): string {
  return process.env.OUTREACH_TRACKING_SECRET?.trim() || process.env.CRON_SECRET?.trim() || "";
}

export function signOpen(leadId: string, step: number): string {
  return createHmac("sha256", secret()).update(`${leadId}:${step}`).digest("hex").slice(0, 16);
}

export function isValidOpen(leadId: string, step: number, signature: string): boolean {
  if (!secret() || !signature) return false;
  const expected = Buffer.from(signOpen(leadId, step), "utf8");
  const given = Buffer.from(signature, "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** The pixel's URL, or null when no secret is set and tracking is off. */
export function openPixelUrl(origin: string, leadId: string, step: number): string | null {
  if (!secret()) return null;
  return `${origin.replace(/\/$/, "")}/api/o/${leadId}/${step}/${signOpen(leadId, step)}.gif`;
}
