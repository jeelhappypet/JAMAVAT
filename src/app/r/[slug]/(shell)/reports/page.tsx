import { requirePageStaff } from "@/lib/auth/page";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { ReportsScreen } from "@/components/reports/ReportsScreen";

export default async function ReportsPage({ params }: PageProps<"/r/[slug]/reports">) {
  const { slug } = await params;
  await requirePageStaff(slug, "/reports");

  return <ReportsScreen thisMonth={getBusinessDate().slice(0, 7)} />;
}
