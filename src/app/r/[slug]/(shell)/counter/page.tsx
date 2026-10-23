import { requirePageStaff } from "@/lib/auth/page";
import { getCounterOrders } from "@/lib/orders/queries";
import { loadTables } from "@/lib/tables";
import { SeatsScreen } from "@/components/counter/SeatsScreen";

/**
 * The counter's landing screen — and, for a counter login, the first thing
 * after the PIN. Its two queries run here rather than as two API calls from
 * the browser: the page already waits for the database once, and a screen
 * that renders with its tables on it beats a skeleton that then fetches.
 */
export default async function CounterSeatsPage({ params }: PageProps<"/r/[slug]/counter">) {
  const { slug } = await params;
  const staff = await requirePageStaff(slug, "/counter");
  const [orders, tables] = await Promise.all([getCounterOrders(staff.restaurantId), loadTables(staff.restaurantId)]);

  return <SeatsScreen initialOrders={orders} initialTables={tables} />;
}
