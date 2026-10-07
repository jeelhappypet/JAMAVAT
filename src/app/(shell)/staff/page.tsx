import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, homePathFor } from "@/lib/auth/access";
import { StaffManager } from "@/components/staff/StaffManager";

export default async function StaffPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (staff.role !== "ADMIN") redirect(homePathFor(staff.role));

  return <StaffManager currentStaffId={staff.id} />;
}
