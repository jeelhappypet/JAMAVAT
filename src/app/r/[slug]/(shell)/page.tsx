import { redirect } from "next/navigation";
import { requirePageStaff } from "@/lib/auth/page";
import { appPath, homePathFor } from "@/lib/auth/access";

/** No home screen in the design: each role opens straight onto its own screen. */
export default async function HomePage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const staff = await requirePageStaff(slug, "/");
  redirect(appPath(slug, homePathFor(staff.role)));
}
