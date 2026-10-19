import { NextResponse } from "next/server";
import { checkPasswordResetToken, setOwnerPassword } from "@/lib/auth/account";
import { resetPasswordSchema } from "@/lib/validation/account";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

export async function POST(request: Request) {
  const t = await getTranslator();
  return respond(t, "err.server", async () => {
    const { token, password } = resetPasswordSchema.parse(await request.json());
    const check = await checkPasswordResetToken(token);
    if (!check.ok) return jsonError(t("resetPassword.invalidToken"), 400);

    await setOwnerPassword(check.restaurantId, password);
    return NextResponse.json({ ok: true });
  });
}
