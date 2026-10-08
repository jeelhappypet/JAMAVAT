import { NextResponse } from "next/server";
import { otpVerifySchema } from "@/lib/validation/guest";
import { resolveSeat } from "@/lib/tables";
import { verifyOtp } from "@/lib/guest/otp";
import { getGuest, newDeviceId, setGuest } from "@/lib/guest/session";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/** Checks the code and marks this phone verified for its current sitting. */
export async function POST(request: Request) {
  const t = await getTranslator();
  return respond(t, "err.otpVerifyFailed", async () => {
    const { token, email, code } = otpVerifySchema.parse(await request.json());
    if (!(await resolveSeat(token))) return NextResponse.json({ error: t("err.qrInvalid"), code: "QR_INVALID" }, { status: 404 });

    const result = await verifyOtp(email, code);
    if (!result.ok) {
      if (result.reason === "WRONG") return jsonError(result.left === 1 ? t("err.otpWrongOne") : t("err.otpWrong", { n: result.left }), 400);
      if (result.reason === "TOO_MANY") return jsonError(t("err.otpTooManyTries"), 429);
      return jsonError(t("err.otpExpired"), 400);
    }

    // Keep the device id if this phone already has one — it may hold a QR lock.
    const current = await getGuest();
    await setGuest({ did: current?.did ?? newDeviceId(), email, vt: Date.now() });
    return NextResponse.json({ email });
  });
}
