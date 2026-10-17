import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { sendOtp } from "@/lib/guest/otp";
import { HQ_OTP_SCOPE } from "@/models/EmailOtp";
import { isHqEmail } from "@/lib/hq/session";
import { jsonError } from "@/lib/api";

const schema = z.object({ email: z.string().trim().toLowerCase().max(120) });

/**
 * Emails a sign-in code to an HQ address. An address that isn't on the
 * allowlist gets the same "code sent" answer as one that is: the reply must
 * not tell a stranger which addresses can open HQ.
 */
export async function POST(request: Request) {
  try {
    const { email } = schema.parse(await request.json());
    if (!isHqEmail(email)) return NextResponse.json({ sent: true });

    await connectToDatabase();
    const result = await sendOtp(HQ_OTP_SCOPE, email, "Jamavat HQ");
    if (!result.ok) {
      if (result.reason === "WAIT") return jsonError(`Wait ${result.seconds}s before asking for another code`, 429);
      if (result.reason === "TOO_MANY") return jsonError("Too many codes asked for. Try again later.", 429);
      return jsonError("Email isn't set up on the server (SMTP_USER / SMTP_PASS)", 503);
    }
    return NextResponse.json({ sent: true, ...(result.devCode ? { devCode: result.devCode } : {}) });
  } catch {
    return jsonError("Couldn't send the code", 400);
  }
}
