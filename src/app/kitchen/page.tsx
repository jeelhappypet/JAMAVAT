import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage, homePathFor } from "@/lib/auth/access";
import { KitchenScreen } from "@/components/kitchen/KitchenScreen";

export default async function KitchenPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (!canAccessPage(staff.role, "/kitchen")) redirect(homePathFor(staff.role));

  return <KitchenScreen staffName={staff.name} role={staff.role} />;
}
