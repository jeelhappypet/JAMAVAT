import { requirePageStaff } from "@/lib/auth/page";
import { TablesManager } from "@/components/tables/TablesManager";

export default async function TablesPage({ params }: PageProps<"/r/[slug]/tables">) {
  const { slug } = await params;
  await requirePageStaff(slug, "/tables");

  return <TablesManager />;
}
