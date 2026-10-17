import { requirePageStaff } from "@/lib/auth/page";
import { KitchenScreen } from "@/components/kitchen/KitchenScreen";

export default async function KitchenPage({ params }: PageProps<"/r/[slug]/kitchen">) {
  const { slug } = await params;
  const staff = await requirePageStaff(slug, "/kitchen");

  return <KitchenScreen staffName={staff.name} role={staff.role} />;
}
