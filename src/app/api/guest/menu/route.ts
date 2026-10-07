import { NextResponse, type NextRequest } from "next/server";
import { resolveSeat } from "@/lib/tables";
import { loadMenuTree } from "@/lib/menu/structure";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** Public (guests, with a valid QR token): the orderable menu, sold-out flags included. */
export async function GET(request: NextRequest) {
  const t = await getTranslator();
  return respond(t, "err.menuLoad", async () => {
    if (!(await resolveSeat(request.nextUrl.searchParams.get("token") ?? ""))) {
      return NextResponse.json({ error: t("err.qrInvalid"), code: "QR_INVALID" }, { status: 404 });
    }
    return NextResponse.json({ menus: await loadMenuTree({ activeOnly: true }) });
  });
}
