import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, canAccessPage } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { NAV_ITEMS } from "@/components/shell/navItems";

export default async function HomePage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  const t = await getTranslator();

  const cards = NAV_ITEMS.filter((item) => item.description && canAccessPage(staff.role, item.href));

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t("home.greeting", { name: staff.name })}</h1>
        <p className="text-[15px] text-text-muted">{t("home.subtitle")}</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {cards.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 rounded-[18px] border border-border bg-surface p-5 active:bg-surface-muted"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand [&_svg]:h-6 [&_svg]:w-6">
              {item.icon}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[17px] font-extrabold">{t(item.label)}</span>
              {item.description ? <span className="text-sm text-text-muted">{t(item.description)}</span> : null}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
