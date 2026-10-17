import { requirePageStaff } from "@/lib/auth/page";
import { TodayScreen } from "@/components/reports/TodayScreen";

export default async function TodayPage({ params }: PageProps<"/r/[slug]/today">) {
  const { slug } = await params;
  await requirePageStaff(slug, "/today");

  return <TodayScreen />;
}
