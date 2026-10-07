import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { loadMenuTree } from "@/lib/menu/structure";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** Menus → categories → items. `?activeOnly=1` hides whatever the admin switched off (ordering screens). */
export async function GET(request: NextRequest) {
  const staff = await requireStaff(ROLES.anyStaff);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.menuLoad", async () => {
    const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "1";
    return NextResponse.json({ menus: await loadMenuTree({ activeOnly }) });
  });
}
