import { NextResponse } from "next/server";
import { otpSendSchema } from "@/lib/validation/guest";
import { resolveSeat } from "@/lib/tables";
import { sendOtp } from "@/lib/guest/otp";
import { getRestaurantName } from "@/lib/restaurant";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/** Emails a 6-digit code. Needs a real QR token so the endpoint can't be used to spam arbitrary inboxes. */
export async function POST(request: Request) {
  const t = await getTranslator();
  return respond(t, "err.otpSendFailed", async () => {
    const { token, email } = otpSendSchema.parse(await request.json());
    if (!(await resolveSeat(token))) return NextResponse.json({ error: t("err.qrInvalid"), code: "QR_INVALID" }, { status: 404 });

    const result = await sendOtp(email, (await getRestaurantName()) ?? "Jamavat");
    if (!result.ok) {
      if (result.reason === "WAIT") return jsonError(t("err.otpWait", { s: result.seconds }), 429);
      if (result.reason === "TOO_MANY") return jsonError(t("err.otpTooMany"), 429);
      return jsonError(t("err.otpSendFailed"), 503);
    }
    return NextResponse.json({ sent: true, ...(result.devCode ? { devCode: result.devCode } : {}) });
  });
}
