import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { verifyOtp } from "@/lib/guest/otp";
import { HQ_OTP_SCOPE } from "@/models/EmailOtp";
import { isHqEmail, startHqSession } from "@/lib/hq/session";
import { jsonError } from "@/lib/api";

const schema = z.object({ email: z.string().trim().toLowerCase().max(120), code: z.string().trim().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  try {
    const { email, code } = schema.parse(await request.json());
    if (!isHqEmail(email)) return jsonError("That code didn't work", 401);

    await connectToDatabase();
    const result = await verifyOtp(HQ_OTP_SCOPE, email, code);
    if (!result.ok) {
      if (result.reason === "TOO_MANY") return jsonError("Too many tries. Ask for a new code.", 429);
      return jsonError(result.reason === "EXPIRED" ? "That code has expired. Ask for a new one." : "That code didn't work", 401);
    }

    await startHqSession(email);
    return NextResponse.json({ ok: true, redirectTo: "/hq" });
  } catch {
    return jsonError("That code didn't work", 400);
  }
}
