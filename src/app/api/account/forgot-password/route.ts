import { NextResponse } from "next/server";
import { createPasswordResetToken, findRestaurantForPasswordReset } from "@/lib/auth/account";
import { sendPasswordResetEmail } from "@/lib/account/resetEmail";
import { forgotPasswordSchema } from "@/lib/validation/account";
import { getBaseUrl } from "@/lib/tables";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/**
 * Unlike HQ's sign-in, this deliberately says plainly when an email isn't
 * registered — the owner asked for that directly rather than an
 * enumeration-safe "we sent it if that address exists" response.
 */
export async function POST(request: Request) {
  const t = await getTranslator();
  return respond(t, "err.server", async () => {
    const { email } = forgotPasswordSchema.parse(await request.json());
    const restaurant = await findRestaurantForPasswordReset(email);
    if (!restaurant) return jsonError(t("forgotPassword.errNotFound"), 404);

    const token = await createPasswordResetToken(String(restaurant._id));
    const link = `${await getBaseUrl()}/reset-password?token=${token}`;
    const sent = await sendPasswordResetEmail(email, restaurant.name, link);
    if (!sent) return jsonError(t("err.server"), 500);

    return NextResponse.json({ ok: true });
  });
}
