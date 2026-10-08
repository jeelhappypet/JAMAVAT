import { NextResponse, type NextRequest } from "next/server";
import { resolveSeat } from "@/lib/tables";
import { getGuest, setGuest } from "@/lib/guest/session";
import { getGuestState } from "@/lib/guest/state";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** Public (guests): who holds this QR, and this device's orders if it's them. */
export async function GET(request: NextRequest) {
  const t = await getTranslator();
  return respond(t, "err.ordersLoad", async () => {
    const resolved = await resolveSeat(request.nextUrl.searchParams.get("token") ?? "");
    if (!resolved) return NextResponse.json({ error: t("err.qrInvalid"), code: "QR_INVALID" }, { status: 404 });
    const guest = await getGuest();
    const state = await getGuestState(resolved, guest);
    // The sitting this email was verified for is over — forget it on the phone too.
    if (guest?.email && !state.verifiedEmail) await setGuest({ did: guest.did });
    return NextResponse.json(state);
  });
}
