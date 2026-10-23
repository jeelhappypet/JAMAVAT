import { requirePageStaff } from "@/lib/auth/page";
import { getTodayReport } from "@/lib/reports";
import { TodayScreen } from "@/components/reports/TodayScreen";

export default async function TodayPage({ params }: PageProps<"/r/[slug]/today">) {
  const { slug } = await params;
  const staff = await requirePageStaff(slug, "/today");
  // Today's figures come with the page — this is where an admin lands after
  // the PIN, and the screen used to open empty and then ask for them.
  const report = await getTodayReport(staff.restaurantId, "today");

  return <TodayScreen initialReport={report} />;
}
