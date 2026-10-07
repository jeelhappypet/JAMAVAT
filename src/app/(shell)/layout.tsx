import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH } from "@/lib/auth/access";
import { getRestaurantName } from "@/lib/restaurant";
import { StaffHeader } from "@/components/shell/StaffHeader";

/** Logged-in staff screens built on the new design share this header. */
export default async function StaffShellLayout({ children }: { children: ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-muted">
      <StaffHeader restaurantName={await getRestaurantName()} staffName={staff.name} role={staff.role} />
      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-5 px-[clamp(16px,3vw,32px)] pb-12 pt-6">
        {children}
      </main>
    </div>
  );
}
