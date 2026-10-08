import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage, homePathFor } from "@/lib/auth/access";
import { SeatBillScreen } from "@/components/counter/SeatBillScreen";

/** Full-screen seat page (no tab header, per the Settle artboard) — back arrow returns to the seats. */
export default async function SeatBillPage({ params }: PageProps<"/counter/seat/[id]">) {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (!canAccessPage(staff.role, "/counter")) redirect(homePathFor(staff.role));
  const { id } = await params;

  return <SeatBillScreen seatId={id} />;
}
