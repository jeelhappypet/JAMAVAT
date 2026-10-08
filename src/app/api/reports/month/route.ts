import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getMonthReport } from "@/lib/reports";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** Admin "Reports" page: ?month=YYYY-MM (defaults to this month). */
export async function GET(request: NextRequest) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.reportLoad", async () => {
    const asked = request.nextUrl.searchParams.get("month") ?? "";
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : getBusinessDate().slice(0, 7);
    return NextResponse.json(await getMonthReport(month));
  });
}
