import { SponsorLead, type SponsorLeadDocument } from "@/models/SponsorLead";
import { getBusinessDate } from "@/lib/utils/businessDate";
import type { OutreachRunSummary, OutreachTaskDTO } from "@/types";
import { OUTREACH_STEPS, dueAt, nextRunnable } from "./sequence";
import * as pitch from "./compose";
import { dailyCap, mailerProblem, sendOutreachMail, sender } from "./mailer";
import { renderTemplate, sendOutreachWhatsApp, whatsappDailyCap, whatsappProblem } from "./whatsapp";
import { openPixelUrl } from "./tracking";
import { siteOrigin } from "@/lib/site/urls";

/**
 * One morning's work. The bot sends the email steps itself and lists the
 * steps a person has to do, then moves every lead it touched forward.
 *
 * WhatsApp goes out as an approved marketing template — the only thing Meta
 * delivers to someone outside the 24-hour window (`lib/outreach/whatsapp.ts`).
 * Until that template is approved, or if no separate outreach number is set,
 * the step falls back to a wa.me link in the digest for HQ to tap, because a
 * restricted number would take the restaurants' own chats down with it.
 */

/** A manual step nobody acted on for this many days is skipped. */
export const MANUAL_PATIENCE_DAYS = 3;

const DAY = 24 * 60 * 60 * 1000;

/** Midnight Asia/Kolkata for the day `now` falls in. */
export function istDayStart(now: Date = new Date()): Date {
  return new Date(`${getBusinessDate(now)}T00:00:00+05:30`);
}

/** What this channel already sent today, so a second run cannot double the cap. */
async function sentToday(dayStart: Date, channel: "email" | "whatsapp"): Promise<number> {
  const rows = await SponsorLead.aggregate<{ n: number }>([
    { $unwind: "$touches" },
    { $match: { "touches.channel": channel, "touches.at": { $gte: dayStart }, "touches.failure": { $in: [null, undefined] } } },
    { $count: "n" },
  ]);
  return rows[0]?.n ?? 0;
}

function task(lead: SponsorLeadDocument, index: number, from: pitch.Sender): OutreachTaskDTO {
  const step = OUTREACH_STEPS[index];
  const base = {
    id: String(lead._id),
    business: lead.business,
    category: lead.category,
    area: lead.area,
    channel: step.channel,
  };
  if (step.channel !== "whatsapp" || !lead.phoneKey) return base;
  const message = pitch.whatsappText(lead, from);
  return { ...base, message, link: pitch.whatsappLink(lead.phoneKey, message) };
}

/**
 * Move a lead to its next step. Every write is conditional on the step the
 * lead was read at, so a cron that fires twice — a retry, two regions — can
 * only advance it once.
 */
async function advance(lead: SponsorLeadDocument, fromStep: number, patch: Record<string, unknown>): Promise<boolean> {
  const result = await SponsorLead.findOneAndUpdate({ _id: lead._id, step: fromStep }, patch, { new: true }).lean();
  return Boolean(result);
}

function closeFor(reason: string) {
  return { $set: { status: "DEAD", closedReason: reason, nextActionAt: null, manualSince: null } };
}

export async function runOutreach(now: Date = new Date()): Promise<OutreachRunSummary> {
  const dayStart = istDayStart(now);
  const summary: OutreachRunSummary = { emailsSent: 0, emailsFailed: 0, whatsappSent: 0, whatsappFailed: 0, manual: [], replied: 0, closed: 0, capLeft: 0 };

  const cap = dailyCap(now);
  let budget = Math.max(0, cap - (await sentToday(dayStart, "email")));
  const waCap = whatsappDailyCap();
  let waBudget = Math.max(0, waCap - (await sentToday(dayStart, "whatsapp")));
  const problem = mailerProblem();
  const waProblem = whatsappProblem();
  const from = sender();
  const origin = siteOrigin();

  const due = (await SponsorLead.find({ status: "ACTIVE", nextActionAt: { $lte: now } })
    .sort({ nextActionAt: 1 })
    .limit(cap * 3)
    .lean()) as unknown as SponsorLeadDocument[];

  for (const lead of due) {
    const index = nextRunnable(lead.step, lead);
    if (index === null) {
      if (await advance(lead, lead.step, closeFor("ran out of steps"))) summary.closed += 1;
      continue;
    }
    const step = OUTREACH_STEPS[index];
    const startedAt = lead.touches[0]?.at ?? lead.createdAt;

    /** Move past this step after a send, or close the lead if it was the last. */
    const moveOn = async (touch: Record<string, unknown>) => {
      const after = nextRunnable(index + 1, lead);
      const at = after === null ? null : dueAt(startedAt, after);
      const done = after === null || !at;
      await advance(lead, lead.step, {
        ...(done ? closeFor("ran out of steps") : { $set: { step: after, nextActionAt: at, manualSince: null } }),
        $push: { touches: { step: index, at: now, ...touch } },
      });
      if (done) summary.closed += 1;
    };

    /** A send that failed for a reason that is not this lead's fault: try again tomorrow. */
    const retryTomorrow = (touch: Record<string, unknown>) =>
      advance(lead, lead.step, {
        $set: { step: index, nextActionAt: new Date(now.getTime() + DAY) },
        $push: { touches: { step: index, at: now, ...touch } },
      });

    // WhatsApp the bot sends itself, as an approved template on its own number.
    if (step.channel === "whatsapp" && !waProblem && lead.phoneKey) {
      const stop = !pitch.isSendable(lead) ? "no live restaurants in this area yet" : waBudget <= 0 ? "daily WhatsApp cap reached" : null;
      if (stop) {
        summary.whatsappFailed += 1;
        await retryTomorrow({ channel: "whatsapp", summary: lead.business, failure: stop });
        continue;
      }
      const text = renderTemplate(lead);
      const result = await sendOutreachWhatsApp(lead, lead.phoneKey);
      if (!result.ok) {
        summary.whatsappFailed += 1;
        await retryTomorrow({ channel: "whatsapp", summary: lead.business, text, failure: `whatsapp: ${result.reason}` });
        continue;
      }
      waBudget -= 1;
      summary.whatsappSent += 1;
      await moveOn({ channel: "whatsapp", summary: text.split("\n")[0], text, wamid: result.whatsappMessageId });
      continue;
    }

    // A step a person has to do: offer it, and give up on it after a few days.
    if (step.channel !== "email") {
      const since = lead.manualSince ?? now;
      if (now.getTime() - since.getTime() >= MANUAL_PATIENCE_DAYS * DAY) {
        const after = nextRunnable(index + 1, lead);
        const at = after === null ? null : dueAt(startedAt, after);
        if (after === null || !at) {
          if (await advance(lead, lead.step, closeFor("ran out of steps"))) summary.closed += 1;
        } else {
          await advance(lead, lead.step, { $set: { step: after, nextActionAt: at, manualSince: null } });
        }
        continue;
      }
      summary.manual.push(task(lead, index, from));
      await advance(lead, lead.step, { $set: { step: index, manualSince: since, nextActionAt: new Date(now.getTime() + DAY) } });
      continue;
    }

    // An email step the bot sends itself.
    const reason = problem
      ? `outreach SMTP: ${problem}`
      : !pitch.isSendable(lead)
        ? "no live restaurants in this area yet"
        : budget <= 0
          ? "daily cap reached"
          : null;

    const followUp = Boolean(step.followUp);
    const subject = pitch.subject(lead, followUp);

    if (reason) {
      summary.emailsFailed += 1;
      // Not the lead's fault — try again tomorrow rather than burning the step.
      await retryTomorrow({ channel: "email", summary: subject, failure: reason });
      continue;
    }

    const lang = lead.lang === "en" ? "en" : "gu";
    const written = pitch.body(lead, from, followUp);
    const text = `${written}\n\n${pitch.optOut(lang)}`;
    const firstMail = lead.touches.find((touch) => touch.channel === "email" && !touch.failure);

    let messageId = "";
    try {
      messageId = await sendOutreachMail({
        to: lead.email!,
        subject,
        text,
        html: pitch.html(written, lang, openPixelUrl(origin, String(lead._id), index)),
        inReplyTo: followUp ? (firstMail?.messageId ?? undefined) : undefined,
      });
    } catch (error) {
      summary.emailsFailed += 1;
      await retryTomorrow({ channel: "email", summary: subject, text, failure: error instanceof Error ? error.message : "send failed" });
      continue;
    }

    budget -= 1;
    summary.emailsSent += 1;
    await moveOn({ channel: "email", summary: subject, text, messageId });
  }

  summary.replied = await SponsorLead.countDocuments({ status: "REPLIED", repliedAt: { $gte: dayStart } });
  summary.capLeft = budget;
  return summary;
}

/**
 * A sponsor answered. The sequence stops at once — nothing is worse than a
 * follow-up that lands after someone already said yes.
 *
 * `lib/whatsapp/webhook.ts` calls this with the wa_id of any inbound message,
 * which is the one reply the bot can notice by itself.
 */
/**
 * A delivery or read tick from Meta's webhook, matched to the touch that
 * carries that wamid. Unlike an email's pixel these are exact — WhatsApp
 * reports them itself — so HQ's thread shows them as ticks and the email's
 * open as a soft "seen".
 */
export async function applyOutreachStatus(wamid: string, status: string, at: Date = new Date()): Promise<boolean> {
  const field = status === "read" ? "readAt" : status === "delivered" ? "deliveredAt" : null;
  if (!field) return false;
  const updated = await SponsorLead.updateOne(
    { touches: { $elemMatch: { wamid, [field]: null } } },
    { $set: { [`touches.$.${field}`]: at } }
  );
  return updated.modifiedCount > 0;
}

export async function markReplied(match: { leadId?: string; phoneKey?: string }, now: Date = new Date()): Promise<boolean> {
  const where = match.leadId ? { _id: match.leadId } : { phoneKey: match.phoneKey };
  if (!match.leadId && !match.phoneKey) return false;
  const updated = await SponsorLead.findOneAndUpdate(
    { ...where, status: "ACTIVE" },
    { $set: { status: "REPLIED", repliedAt: now, nextActionAt: null, manualSince: null, closedReason: "replied" } }
  ).lean();
  return Boolean(updated);
}
