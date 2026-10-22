import { escapeHtml, isMailConfigured, sendMail } from "@/lib/mail";

/**
 * The email an owner gets when HQ creates their restaurant. It carries the
 * one-time link that makes their first admin login, so it's the only place
 * that link is sent — HQ can show it again, or issue a fresh one.
 */
export async function sendInviteEmail(to: string, restaurantName: string, link: string): Promise<boolean> {
  if (!isMailConfigured()) return false;
  const name = escapeHtml(restaurantName);
  try {
    await sendMail({
      to,
      fromName: "Jamavat",
      subject: `Your Jamavat login for ${restaurantName}`,
      text: `${restaurantName} is ready on Jamavat.\n\nOpen this link to create your owner login (it works once, for 14 days):\n${link}\n\nAfter that you can add your menu, tables and staff.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:460px;margin:auto;padding:24px;color:#1c1917">
  <p style="font-size:17px;font-weight:bold;margin:0 0 10px">${name} is ready on Jamavat</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 18px">Open this link to create your owner login. It works once, and for 14 days.</p>
  <p style="margin:0 0 18px"><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#b2560a;color:#ffffff;font-weight:bold;text-decoration:none">Create my login</a></p>
  <p style="font-size:13px;color:#57534e;margin:0;word-break:break-all">${escapeHtml(link)}</p>
</div>`,
    });
    return true;
  } catch (error) {
    console.error("[hq] invite email failed", error);
    return false;
  }
}
