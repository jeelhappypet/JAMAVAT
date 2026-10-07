"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, RestaurantInitial } from "@/components/brand/BrandMark";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { NAV_ITEMS } from "@/components/shell/navItems";
import { canAccessPage } from "@/lib/auth/access";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { StaffRole } from "@/types";

interface StaffHeaderProps {
  restaurantName: string | null;
  staffName: string;
  role: StaffRole;
}

/** The staff app header from the Admin / Counter artboards: restaurant, language, account, then role tabs. */
export function StaffHeader({ restaurantName, staffName, role }: StaffHeaderProps) {
  const { t } = useI18n();
  const pathname = usePathname() ?? "/";
  const items = NAV_ITEMS.filter((item) => canAccessPage(role, item.href));

  return (
    <header className="border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-2.5 px-[clamp(16px,3vw,32px)] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {restaurantName ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <RestaurantInitial name={restaurantName} size={38} solid />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-base font-extrabold">{restaurantName}</span>
                <span className="text-[11px] font-semibold text-text-muted">
                  {t(`role.${role}`)} · {t("common.onJamavat")}
                </span>
              </span>
            </div>
          ) : (
            <BrandMark size={38} withName />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle />
            <AccountMenu name={staffName} role={role} />
          </div>
        </div>

        <nav aria-label={t("brand.staff")} className="no-scrollbar -mx-1 flex gap-0.5 overflow-x-auto">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-3.5 py-3 text-sm ${
                  active ? "border-brand font-extrabold text-brand-dark" : "border-transparent font-semibold text-stone-700"
                }`}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
