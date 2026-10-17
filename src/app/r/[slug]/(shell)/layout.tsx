import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, appPath, homePathFor } from "@/lib/auth/access";
import { StaffHeader } from "@/components/shell/StaffHeader";

/** Logged-in staff screens built on the new design share this header. */
export default async function StaffShellLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (staff.restaurantSlug !== slug) redirect(appPath(staff.restaurantSlug, homePathFor(staff.role)));

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-muted">
      <StaffHeader staffName={staff.name} role={staff.role} />
      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-5 px-[clamp(16px,3vw,32px)] pb-12 pt-6">
        {children}
      </main>
    </div>
  );
}
