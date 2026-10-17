import { RestaurantDetail } from "@/components/hq/RestaurantDetail";

export default async function HqRestaurantPage({ params }: PageProps<"/hq/restaurants/[id]">) {
  const { id } = await params;
  return <RestaurantDetail id={id} />;
}
