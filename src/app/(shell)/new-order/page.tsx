import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage, homePathFor } from "@/lib/auth/access";
import { NewOrderScreen } from "@/components/counter/NewOrderScreen";

/** Counter "New parcel" tab — or, with ?seat=, extra dishes for a seated guest's bill. */
export default async function NewOrderPage({ searchParams }: PageProps<"/new-order">) {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (!canAccessPage(staff.role, "/new-order")) redirect(homePathFor(staff.role));
  const { seat } = await searchParams;

  return <NewOrderScreen seatId={typeof seat === "string" ? seat : undefined} />;
}
