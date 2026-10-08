import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage, homePathFor } from "@/lib/auth/access";
import { CounterMenuScreen } from "@/components/counter/CounterMenuScreen";

export default async function CounterMenuPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (!canAccessPage(staff.role, "/counter/menu")) redirect(homePathFor(staff.role));

  return <CounterMenuScreen />;
}
