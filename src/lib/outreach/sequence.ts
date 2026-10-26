import type { OutreachChannel } from "@/types";

/**
 * The follow-up sequence from `SPONSOR_EMAIL_OUTREACH.md` §4. Two emails and
 * no more: after that the address is burnt and the next sponsor in that
 * street hears about it.
 *
 * `afterDays` is counted from the first touch, not from the previous one, so
 * a day the bot did not run (a deploy, a cron miss) shortens the gap instead
 * of pushing the whole sequence back a week.
 */
export interface OutreachStep {
  channel: OutreachChannel;
  afterDays: number;
  /** A second email replies on the first one's thread rather than opening a new subject. */
  followUp?: boolean;
}

export const OUTREACH_STEPS: readonly OutreachStep[] = [
  { channel: "email", afterDays: 0 },
  { channel: "whatsapp", afterDays: 3 },
  { channel: "email", afterDays: 7, followUp: true },
  { channel: "visit", afterDays: 14 },
];

/**
 * Steps the bot can perform by itself. A visit never can. WhatsApp only can
 * once an approved template and a separate outreach number are configured —
 * `lib/outreach/whatsapp.ts` decides that at send time, and falls back to a
 * link in the digest when they are not.
 */
export function isAutomatic(step: OutreachStep): boolean {
  return step.channel !== "visit";
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * When step `index` falls due, measured from `startedAt`. Past the last step
 * the lead is done — null, and the caller closes it with "ran out".
 */
export function dueAt(startedAt: Date, index: number): Date | null {
  const step = OUTREACH_STEPS[index];
  if (!step) return null;
  return new Date(startedAt.getTime() + step.afterDays * DAY);
}

/**
 * A lead is only ready when it has what its next step needs: an email step
 * with no address would otherwise fail every morning forever.
 */
export function canRun(step: OutreachStep, lead: { email?: string | null; phoneKey?: string | null }): boolean {
  if (step.channel === "email") return Boolean(lead.email);
  if (step.channel === "whatsapp") return Boolean(lead.phoneKey);
  return true;
}

/**
 * The next step a lead can actually do, skipping ones it has no contact
 * detail for. Returns null when nothing is left.
 */
export function nextRunnable(from: number, lead: { email?: string | null; phoneKey?: string | null }): number | null {
  for (let index = from; index < OUTREACH_STEPS.length; index += 1) {
    if (canRun(OUTREACH_STEPS[index], lead)) return index;
  }
  return null;
}
