import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage, homePathFor } from "@/lib/auth/access";
import { OrdersScreen } from "@/components/counter/OrdersScreen";

export default async function CounterOrdersPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (!canAccessPage(staff.role, "/counter/orders")) redirect(homePathFor(staff.role));

  return <OrdersScreen />;
}
