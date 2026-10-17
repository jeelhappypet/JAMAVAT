import { requirePageStaff } from "@/lib/auth/page";
import { SeatsScreen } from "@/components/counter/SeatsScreen";

export default async function CounterSeatsPage({ params }: PageProps<"/r/[slug]/counter">) {
  const { slug } = await params;
  await requirePageStaff(slug, "/counter");

  return <SeatsScreen />;
}
