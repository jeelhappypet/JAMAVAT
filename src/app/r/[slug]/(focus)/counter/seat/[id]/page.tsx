import { requirePageStaff } from "@/lib/auth/page";
import { SeatBillScreen } from "@/components/counter/SeatBillScreen";

/** Full-screen seat page (no tab header, per the Settle artboard) — back arrow returns to the seats. */
export default async function SeatBillPage({ params }: PageProps<"/r/[slug]/counter/seat/[id]">) {
  const { slug, id } = await params;
  await requirePageStaff(slug, "/counter");

  return <SeatBillScreen seatId={id} />;
}
