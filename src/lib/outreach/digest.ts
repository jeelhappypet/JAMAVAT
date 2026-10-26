import { escapeHtml, sendMail } from "@/lib/mail";
import type { OutreachRunSummary } from "@/types";
import { digestTo, mailerProblem } from "./mailer";

/**
 * The morning digest is the bot's whole interface. It says what went out by
 * itself and carries the WhatsApp steps as links with the message already
 * written — HQ reads the line, taps, presses send. There is no screen to
 * remember to open, which is the only reason a follow-up sequence survives
 * contact with a working day.
 *
 * It goes out on the product's own SMTP (`lib/mail.ts`) and not the outreach
 * account: it is one internal mail to one address, so it carries no spam
 * risk, and it must still arrive on a morning when the outreach account is
 * exactly what is broken.
 */

const label = { email: "Email", whatsapp: "WhatsApp", visit: "Visit" } as const;

function row(cells: string[]): string {
  return `<tr>${cells.map((cell) => `<td style="padding:7px 10px;border-bottom:1px solid #e7e5e4;vertical-align:top">${cell}</td>`).join("")}</tr>`;
}

export function digestHtml(summary: OutreachRunSummary, date: string): string {
  const problem = mailerProblem();
  const parts: string[] = [
    `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:#1c1917;max-width:620px">`,
    `<h2 style="margin:0 0 4px;font-size:18px">Sponsor outreach — ${escapeHtml(date)}</h2>`,
  ];

  if (problem === "unset") {
    parts.push(
      `<p style="margin:12px 0;padding:10px 12px;background:#fef2f2;border-left:3px solid #dc2626">No outreach SMTP account is set, so nothing was emailed. Set <code>OUTREACH_SMTP_USER</code> and <code>OUTREACH_SMTP_PASS</code> to an address that is <strong>not</strong> the one sending guest bills and OTPs.</p>`
    );
  } else if (problem === "shared-account") {
    parts.push(
      `<p style="margin:12px 0;padding:10px 12px;background:#fef2f2;border-left:3px solid #dc2626"><strong>Stopped on purpose.</strong> <code>OUTREACH_SMTP_USER</code> is the same account as <code>SMTP_USER</code>. Sending cold mail from it would put guest OTPs in spam and break ordering. Use a separate address.</p>`
    );
  }

  parts.push(
    `<p style="margin:10px 0 16px">`,
    `<strong>${summary.emailsSent}</strong> emails sent · `,
    `<strong>${summary.manual.length}</strong> waiting for you · `,
    `<strong>${summary.replied}</strong> replied · `,
    `<strong>${summary.closed}</strong> closed`,
    summary.emailsFailed ? ` · <span style="color:#b91c1c"><strong>${summary.emailsFailed}</strong> not sent</span>` : "",
    `<br><span style="color:#78716c;font-size:12px">${summary.capLeft} more emails allowed today</span>`,
    `</p>`
  );

  if (summary.manual.length) {
    parts.push(
      `<h3 style="margin:18px 0 6px;font-size:15px">Your list today</h3>`,
      `<table style="border-collapse:collapse;width:100%;font-size:13px">`,
      summary.manual
        .map((item) =>
          row([
            `<strong>${escapeHtml(item.business)}</strong><br><span style="color:#78716c">${escapeHtml(item.category)} · ${escapeHtml(item.area)}</span>`,
            escapeHtml(label[item.channel]),
            item.link
              ? `<a href="${escapeHtml(item.link)}" style="display:inline-block;padding:6px 12px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none">Open WhatsApp</a>`
              : `<span style="color:#78716c">Go in person</span>`,
          ])
        )
        .join(""),
      `</table>`,
      `<p style="margin:8px 0 0;color:#78716c;font-size:12px">The message is already written in the link — read it, change what you want, press send yourself.</p>`
    );
  } else {
    parts.push(`<p style="margin:18px 0;color:#78716c">Nothing needs you by hand today.</p>`);
  }

  parts.push(
    `<p style="margin:22px 0 0;color:#78716c;font-size:12px">Two emails per business and no more. A reply stops the sequence at once — mark it in HQ, or it stops by itself when they WhatsApp you back.</p>`,
    `</div>`
  );
  return parts.join("");
}

export function digestText(summary: OutreachRunSummary, date: string): string {
  const lines = [
    `Sponsor outreach — ${date}`,
    "",
    `${summary.emailsSent} sent · ${summary.manual.length} waiting for you · ${summary.replied} replied · ${summary.closed} closed`,
    summary.emailsFailed ? `${summary.emailsFailed} not sent` : "",
    "",
  ];
  for (const item of summary.manual) {
    lines.push(`${label[item.channel]} — ${item.business} (${item.category}, ${item.area})`);
    if (item.link) lines.push(item.link);
  }
  return lines.filter((line) => line !== undefined).join("\n");
}

/** Sends the digest. Returns false when there is nobody to send it to. */
export async function sendDigest(summary: OutreachRunSummary, date: string): Promise<boolean> {
  const to = digestTo();
  if (!to) return false;
  await sendMail({
    to,
    subject: `Outreach — ${summary.emailsSent} sent, ${summary.manual.length} for you`,
    html: digestHtml(summary, date),
    text: digestText(summary, date),
    fromName: "Jamavat",
  });
  return true;
}
