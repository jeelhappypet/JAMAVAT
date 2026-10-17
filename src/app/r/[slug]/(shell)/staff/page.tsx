import { requirePageStaff } from "@/lib/auth/page";
import { StaffManager } from "@/components/staff/StaffManager";

export default async function StaffPage({ params }: PageProps<"/r/[slug]/staff">) {
  const { slug } = await params;
  const staff = await requirePageStaff(slug, "/staff");

  return <StaffManager currentStaffId={staff.id} />;
}
