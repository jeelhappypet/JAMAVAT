import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTodayReport } from "@/lib/reports";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";
import { REPORT_RANGES, type ReportRange } from "@/types";

/** Admin "Today" page: ?range=today|yesterday|week|month. */
export async function GET(request: NextRequest) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.reportLoad", async () => {
    const asked = request.nextUrl.searchParams.get("range");
    const range: ReportRange = REPORT_RANGES.includes(asked as ReportRange) ? (asked as ReportRange) : "today";
    return NextResponse.json(await getTodayReport(range));
  });
}
