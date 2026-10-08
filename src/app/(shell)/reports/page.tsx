import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage, homePathFor } from "@/lib/auth/access";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { ReportsScreen } from "@/components/reports/ReportsScreen";

export default async function ReportsPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (!canAccessPage(staff.role, "/reports")) redirect(homePathFor(staff.role));

  return <ReportsScreen thisMonth={getBusinessDate().slice(0, 7)} />;
}
