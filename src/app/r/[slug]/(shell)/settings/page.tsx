import { requirePageStaff } from "@/lib/auth/page";
import { getRestaurantSettings } from "@/lib/restaurant";
import { isMailConfigured } from "@/lib/mail";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage({ params }: PageProps<"/r/[slug]/settings">) {
  const { slug } = await params;
  const staff = await requirePageStaff(slug, "/settings");

  const settings = await getRestaurantSettings(staff.restaurantId);
  return <SettingsForm initial={settings} mailReady={isMailConfigured()} />;
}
