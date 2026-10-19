import { escapeHtml, isMailConfigured, sendMail } from "@/lib/mail";

/** "Forgot password" link for the owner login on Jamavat's own site — modeled on hq/inviteEmail.ts. */
export async function sendPasswordResetEmail(to: string, restaurantName: string, link: string): Promise<boolean> {
  if (!isMailConfigured()) return false;
  const name = escapeHtml(restaurantName);
  try {
    await sendMail({
      to,
      fromName: "Jamavat",
      subject: `Reset your Jamavat password for ${restaurantName}`,
      text: `Reset the owner login password for ${restaurantName}.\n\nOpen this link within the hour:\n${link}\n\nIf you didn't ask for this, ignore this email — your password stays the same.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:460px;margin:auto;padding:24px;color:#1c1917">
  <p style="font-size:17px;font-weight:bold;margin:0 0 10px">Reset your password</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 18px">For the owner login of <strong>${name}</strong> on Jamavat. This link works once, for the next hour.</p>
  <p style="margin:0 0 18px"><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#c2410c;color:#ffffff;font-weight:bold;text-decoration:none">Choose a new password</a></p>
  <p style="font-size:13px;color:#57534e;margin:0 0 18px;word-break:break-all">${escapeHtml(link)}</p>
  <p style="font-size:13px;color:#57534e;margin:0">Didn't ask for this? Ignore this email — your password stays the same.</p>
</div>`,
    });
    return true;
  } catch (error) {
    console.error("[account] password reset email failed", error);
    return false;
  }
}
