import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, homePathFor } from "@/lib/auth/access";
import { TablesManager } from "@/components/tables/TablesManager";

export default async function TablesPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (staff.role !== "ADMIN") redirect(homePathFor(staff.role));

  return <TablesManager />;
}
