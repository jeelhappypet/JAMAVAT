import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { EmailOtp, type EmailOtpDocument } from "@/models/EmailOtp";
import { escapeHtml, isMailConfigured, sendMail } from "@/lib/mail";

const CODE_TTL_MINUTES = 10;
const RESEND_AFTER_SECONDS = 30;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function hashCode(email: string, code: string): string {
  return createHmac("sha256", `otp:${process.env.ADMIN_SESSION_SECRET}`).update(`${email}:${code}`).digest("hex");
}

export type SendResult =
  | { ok: true; devCode?: string }
  | { ok: false; reason: "WAIT"; seconds: number }
  | { ok: false; reason: "TOO_MANY" }
  | { ok: false; reason: "MAIL_DOWN" };

export async function sendOtp(email: string, restaurantName: string): Promise<SendResult> {
  const recent = await EmailOtp.find({ email, createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } })
    .sort({ createdAt: -1 })
    .lean<EmailOtpDocument[]>();
  if (recent[0]) {
    const waited = (Date.now() - recent[0].createdAt.getTime()) / 1000;
    if (waited < RESEND_AFTER_SECONDS) return { ok: false, reason: "WAIT", seconds: Math.ceil(RESEND_AFTER_SECONDS - waited) };
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) return { ok: false, reason: "TOO_MANY" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await EmailOtp.create({ email, codeHash: hashCode(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000) });

  if (!isMailConfigured()) {
    // Local development without SMTP: show the code instead of failing. Never in production.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[otp] ${email} → ${code}`);
      return { ok: true, devCode: code };
    }
    return { ok: false, reason: "MAIL_DOWN" };
  }

  try {
    const name = escapeHtml(restaurantName);
    await sendMail({
      to: email,
      fromName: restaurantName,
      subject: `${code} is your ${restaurantName} code`,
      text: `Your code is ${code}. It's valid for ${CODE_TTL_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1c1917">
  <p style="font-size:16px;font-weight:bold;margin:0 0 8px">${name}</p>
  <p style="font-size:15px;margin:0 0 16px">Your code to order from your table:</p>
  <p style="font-size:34px;font-weight:bold;letter-spacing:8px;margin:0 0 16px;color:#c2410c">${code}</p>
  <p style="font-size:13px;color:#57534e;margin:0">Valid for ${CODE_TTL_MINUTES} minutes. If you didn't ask for this code, you can ignore this email.</p>
  <p style="font-size:12px;color:#57534e;margin:24px 0 0">Sent with Jamavat</p>
</div>`,
    });
  } catch (error) {
    console.error("[otp] email failed", error);
    await EmailOtp.deleteMany({ email, codeHash: hashCode(email, code) });
    return { ok: false, reason: "MAIL_DOWN" };
  }
  return { ok: true };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "WRONG"; left: number } | { ok: false; reason: "EXPIRED" | "TOO_MANY" };

export async function verifyOtp(email: string, code: string): Promise<VerifyResult> {
  const latest = await EmailOtp.findOne({ email }).sort({ createdAt: -1 }).lean<EmailOtpDocument>();
  if (!latest || latest.expiresAt.getTime() < Date.now()) return { ok: false, reason: "EXPIRED" };
  if (latest.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "TOO_MANY" };

  const a = Buffer.from(hashCode(email, code));
  const b = Buffer.from(latest.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    const updated = await EmailOtp.findByIdAndUpdate(latest._id, { $inc: { attempts: 1 } }, { returnDocument: "after" }).lean<EmailOtpDocument>();
    const left = MAX_ATTEMPTS - (updated?.attempts ?? MAX_ATTEMPTS);
    return left <= 0 ? { ok: false, reason: "TOO_MANY" } : { ok: false, reason: "WRONG", left };
  }

  await EmailOtp.deleteMany({ email });
  return { ok: true };
}
