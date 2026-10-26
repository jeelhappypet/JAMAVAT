import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outreach mail goes out on its own SMTP account, never the product's.
 *
 * `lib/mail.ts` sends the guest's bill and — the part that matters — the
 * guest's OTP, which is how an order gets placed at all. Push cold sales mail
 * through that account and Gmail starts filing it as spam: the OTP stops
 * arriving and ordering breaks silently, in every restaurant, with nothing in
 * the logs to say why. Enough spam reports and Google suspends the account
 * and nothing sends.
 *
 * So this module refuses to run on `SMTP_USER`. Set OUTREACH_SMTP_USER to a
 * separate address (partner@…) with its own app password.
 */

let transporter: Transporter | null | undefined;

export type OutreachMailerError = "unset" | "shared-account";

/** Why outreach mail cannot go out, or null when it can. */
export function mailerProblem(): OutreachMailerError | null {
  const user = process.env.OUTREACH_SMTP_USER?.trim();
  const pass = process.env.OUTREACH_SMTP_PASS?.trim();
  if (!user || !pass) return "unset";
  if (user.toLowerCase() === process.env.SMTP_USER?.trim().toLowerCase()) return "shared-account";
  return null;
}

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (mailerProblem()) {
    transporter = null;
    return transporter;
  }
  const port = Number(process.env.OUTREACH_SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: process.env.OUTREACH_SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.OUTREACH_SMTP_USER!.trim(), pass: process.env.OUTREACH_SMTP_PASS!.trim() },
  });
  return transporter;
}

/** Tests swap the env and need the memoised transport thrown away. */
export function resetOutreachMailer(): void {
  transporter = undefined;
}

/**
 * The daily ceiling, ramped: a fresh Gmail that sends a hundred mails on its
 * first morning gets throttled and never recovers its reputation
 * (`SPONSOR_EMAIL_OUTREACH.md` §1). `OUTREACH_STARTED_ON` is the day the
 * account began sending — set it once and leave it.
 */
export function dailyCap(today: Date = new Date()): number {
  const ceiling = Number(process.env.OUTREACH_DAILY_CAP || 30);
  const started = process.env.OUTREACH_STARTED_ON?.trim();
  if (!started) return Math.min(ceiling, 10);
  const startedAt = new Date(`${started}T00:00:00Z`);
  if (Number.isNaN(startedAt.getTime())) return Math.min(ceiling, 10);
  const days = Math.floor((today.getTime() - startedAt.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 3) return Math.min(ceiling, 10);
  if (days < 7) return Math.min(ceiling, 20);
  return ceiling;
}

/** HQ's own name and number — what signs the pitch and what a sponsor calls back. */
export function sender(): { name: string; phone: string } {
  return {
    name: process.env.OUTREACH_SENDER_NAME?.trim() || "Jamavat",
    phone: process.env.OUTREACH_SENDER_PHONE?.trim() || "",
  };
}

/** Where the morning digest goes. Falls back to the first HQ address. */
export function digestTo(): string | null {
  const explicit = process.env.OUTREACH_DIGEST_TO?.trim();
  if (explicit) return explicit;
  return (process.env.HQ_EMAILS || "").split(",")[0]?.trim() || null;
}

export async function sendOutreachMail({
  to,
  subject,
  html,
  text,
  inReplyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Set on a follow-up so it lands on the first mail's thread, not a new one. */
  inReplyTo?: string;
}): Promise<string> {
  const mailer = getTransporter();
  if (!mailer) throw new Error(`Outreach mail isn't configured (${mailerProblem()})`);
  const from = process.env.OUTREACH_MAIL_FROM || process.env.OUTREACH_SMTP_USER!;
  const info = await mailer.sendMail({
    from: `"${sender().name.replace(/"/g, "")}" <${from}>`,
    // One address in To and nothing in CC: SPONSOR_EMAIL_OUTREACH.md §1.
    to,
    subject,
    html,
    text,
    ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
    // A blind copy to HQ's own file, and only ever that one address.
    ...(process.env.OUTREACH_BCC?.trim() ? { bcc: process.env.OUTREACH_BCC.trim() } : {}),
  });
  return String(info.messageId || "");
}
