import { requirePageStaff } from "@/lib/auth/page";
import { CounterMenuScreen } from "@/components/counter/CounterMenuScreen";

export default async function CounterMenuPage({ params }: PageProps<"/r/[slug]/counter/menu">) {
  const { slug } = await params;
  await requirePageStaff(slug, "/counter/menu");

  return <CounterMenuScreen />;
}
