import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, homePathFor } from "@/lib/auth/access";
import { getRestaurantName, getRestaurantSettings } from "@/lib/restaurant";
import { isMailConfigured } from "@/lib/mail";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (staff.role !== "ADMIN") redirect(homePathFor(staff.role));

  const [name, settings] = await Promise.all([getRestaurantName(), getRestaurantSettings()]);
  return <SettingsForm initial={{ ...settings, name: name ?? "" }} mailReady={isMailConfigured()} />;
}
