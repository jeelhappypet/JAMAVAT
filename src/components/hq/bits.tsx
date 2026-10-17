import { Badge } from "@/components/ui/Badge";
import type { HqRestaurantDTO, SubscriptionState } from "@/types";

const STATE: Record<SubscriptionState, { label: string; tone: "green" | "orange" | "red" | "stone" }> = {
  ok: { label: "Live", tone: "green" },
  due: { label: "Payment due", tone: "orange" },
  expired: { label: "Expired", tone: "red" },
  suspended: { label: "Paused", tone: "red" },
  cancelled: { label: "Cancelled", tone: "stone" },
};

/** One pill that says whether a restaurant is working and until when. */
export function SubscriptionBadge({ restaurant }: { restaurant: HqRestaurantDTO }) {
  const state = STATE[restaurant.state];
  const days = restaurant.daysLeft;
  const note =
    restaurant.state === "ok" && days !== undefined && days <= 7
      ? ` · ${days}d left`
      : restaurant.state === "ok" && restaurant.status === "TRIAL"
        ? " · trial"
        : "";
  return (
    <Badge tone={state.tone}>
      {state.label}
      {note}
    </Badge>
  );
}

/** "18 Oct 2026" — the same shape everywhere in HQ. */
export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
