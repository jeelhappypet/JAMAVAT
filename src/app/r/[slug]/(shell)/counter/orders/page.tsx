import { requirePageStaff } from "@/lib/auth/page";
import { OrdersScreen } from "@/components/counter/OrdersScreen";

export default async function CounterOrdersPage({ params }: PageProps<"/r/[slug]/counter/orders">) {
  const { slug } = await params;
  await requirePageStaff(slug, "/counter/orders");

  return <OrdersScreen />;
}
