import { requirePageStaff } from "@/lib/auth/page";
import { describeKitchenScope, getKitchenScope, getKitchenTickets } from "@/lib/orders/kitchen";
import { KitchenScreen } from "@/components/kitchen/KitchenScreen";

export default async function KitchenPage({ params }: PageProps<"/r/[slug]/kitchen">) {
  const { slug } = await params;
  const staff = await requirePageStaff(slug, "/kitchen");

  // The tickets come with the page: this is the screen a cook sees first
  // after the PIN, and it used to render a skeleton and then ask for them.
  const scope = await getKitchenScope(staff);
  const [tickets, scopeInfo] = await Promise.all([getKitchenTickets(staff.restaurantId, scope), describeKitchenScope(staff.restaurantId, scope)]);

  return <KitchenScreen staffName={staff.name} role={staff.role} initialTickets={tickets} initialScope={scopeInfo} />;
}
