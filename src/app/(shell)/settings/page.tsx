import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, homePathFor } from "@/lib/auth/access";
import { getRestaurantName } from "@/lib/restaurant";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (staff.role !== "ADMIN") redirect(homePathFor(staff.role));

  return <SettingsForm initialRestaurantName={(await getRestaurantName()) ?? ""} />;
}
