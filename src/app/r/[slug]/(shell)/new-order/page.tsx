import { requirePageStaff } from "@/lib/auth/page";
import { NewOrderScreen } from "@/components/counter/NewOrderScreen";

/** Counter "New parcel" tab — or, with ?seat=, extra dishes for a seated guest's bill. */
export default async function NewOrderPage({ params, searchParams }: PageProps<"/r/[slug]/new-order">) {
  const [{ slug }, { seat }] = await Promise.all([params, searchParams]);
  await requirePageStaff(slug, "/new-order");

  return <NewOrderScreen seatId={typeof seat === "string" ? seat : undefined} />;
}
