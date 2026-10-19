import { NextResponse } from "next/server";
import { verifyOwnerLogin } from "@/lib/auth/account";
import { ownerLoginSchema } from "@/lib/validation/account";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/**
 * "Find my restaurant" login on Jamavat's own site — username-or-email +
 * password. On success the client is handed the restaurant's slug and
 * redirects to its own `/login` PIN screen; this route never itself starts
 * a staff session.
 */
export async function POST(request: Request) {
  const t = await getTranslator();
  return respond(t, "err.server", async () => {
    const { identifier, password } = ownerLoginSchema.parse(await request.json());
    const result = await verifyOwnerLogin(identifier, password);

    if (!result.ok) {
      if (result.reason === "NO_STAFF") return jsonError(t("ownerLogin.errNoStaff"), 403);
      if (result.reason === "LOCKED") return jsonError(t("ownerLogin.errLocked", { m: result.minutes }), 429);
      return jsonError(t("ownerLogin.errInvalid"), 401);
    }
    return NextResponse.json({ slug: result.slug });
  });
}
