import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage, homePathFor } from "@/lib/auth/access";
import { SeatsScreen } from "@/components/counter/SeatsScreen";

export default async function CounterSeatsPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (!canAccessPage(staff.role, "/counter")) redirect(homePathFor(staff.role));

  return <SeatsScreen />;
}
