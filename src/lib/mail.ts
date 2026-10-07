import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null | undefined;

/**
 * Gmail SMTP by default: SMTP_USER is the Gmail address and SMTP_PASS a
 * Google "App password" (not the account password). Any other SMTP works by
 * setting SMTP_HOST/SMTP_PORT too.
 */
function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }
  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export function isMailConfigured(): boolean {
  return getTransporter() !== null;
}

export async function sendMail({ to, subject, html, text, fromName }: { to: string; subject: string; html: string; text: string; fromName: string }) {
  const mailer = getTransporter();
  if (!mailer) throw new Error("Email isn't configured (SMTP_USER / SMTP_PASS)");
  const address = process.env.MAIL_FROM || process.env.SMTP_USER;
  await mailer.sendMail({ from: `"${fromName.replace(/"/g, "")}" <${address}>`, to, subject, html, text });
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
