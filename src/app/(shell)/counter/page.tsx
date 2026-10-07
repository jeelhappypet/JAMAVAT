import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage, homePathFor } from "@/lib/auth/access";
import { CounterScreen } from "@/components/counter/CounterScreen";

export default async function CounterPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (!canAccessPage(staff.role, "/counter")) redirect(homePathFor(staff.role));

  return <CounterScreen />;
}
