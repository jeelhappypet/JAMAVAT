import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage, homePathFor } from "@/lib/auth/access";
import { TodayScreen } from "@/components/reports/TodayScreen";

export default async function TodayPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (!canAccessPage(staff.role, "/today")) redirect(homePathFor(staff.role));

  return <TodayScreen />;
}
