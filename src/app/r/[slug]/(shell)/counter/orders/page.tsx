import { requirePageStaff } from "@/lib/auth/page";
import { getCounterOrders } from "@/lib/orders/queries";
import { OrdersScreen } from "@/components/counter/OrdersScreen";

export default async function CounterOrdersPage({ params }: PageProps<"/r/[slug]/counter/orders">) {
  const { slug } = await params;
  const staff = await requirePageStaff(slug, "/counter/orders");

  return <OrdersScreen initialOrders={await getCounterOrders(staff.restaurantId)} />;
}
