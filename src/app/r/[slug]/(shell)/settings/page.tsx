import { requirePageStaff } from "@/lib/auth/page";
import { getRestaurantInfo, getRestaurantSettings } from "@/lib/restaurant";
import { planLimits } from "@/lib/limits";
import { subscriptionState } from "@/lib/subscription";
import { isMailConfigured } from "@/lib/mail";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Plan, type PlanDocument } from "@/models/Plan";
import { Seat } from "@/models/Seat";
import { Staff } from "@/models/Staff";
import { PlanCard } from "@/components/settings/PlanCard";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage({ params }: PageProps<"/r/[slug]/settings">) {
  const { slug } = await params;
  const staff = await requirePageStaff(slug, "/settings");
  const { restaurantId } = staff;

  await connectToDatabase();
  const [settings, restaurant, limits, usedSeats, usedStaff] = await Promise.all([
    getRestaurantSettings(restaurantId),
    getRestaurantInfo(restaurantId),
    planLimits(restaurantId),
    Seat.countDocuments({ restaurantId, isActive: true }),
    Staff.countDocuments({ restaurantId, isActive: true }),
  ]);
  const plan = restaurant?.planId ? await Plan.findById(restaurant.planId).select({ name: 1 }).lean<PlanDocument>() : null;

  return (
    <>
      <SettingsForm initial={settings} mailReady={isMailConfigured()} />
      {restaurant ? (
        <PlanCard
          planName={plan?.name?.en || undefined}
          state={subscriptionState(restaurant)}
          isTrial={restaurant.status === "TRIAL"}
          paidUntil={restaurant.paidUntil?.toISOString()}
          maxSeats={limits.maxSeats}
          maxStaff={limits.maxStaff}
          usedSeats={usedSeats}
          usedStaff={usedStaff}
        />
      ) : null}
    </>
  );
}
