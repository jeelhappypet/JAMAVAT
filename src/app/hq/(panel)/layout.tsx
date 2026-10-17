import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { HqHeader } from "@/components/hq/HqHeader";
import { getHqEmail } from "@/lib/hq/session";

/** Every HQ screen but the sign-in one, which sits outside this group so it can't redirect to itself. */
export default async function HqPanelLayout({ children }: { children: ReactNode }) {
  const email = await getHqEmail();
  if (!email) redirect("/hq/login");

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <HqHeader email={email} />
      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-5 px-[clamp(16px,3vw,32px)] pb-12 pt-6">{children}</main>
    </div>
  );
}
