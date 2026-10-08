"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, RestaurantInitial } from "@/components/brand/BrandMark";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { IconButton } from "@/components/ui/IconButton";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { ADMIN_NAV, COUNTER_NAV, activeHref, isCounterPath } from "@/components/shell/navItems";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { COUNTER_SOUND, useSoundPref } from "@/lib/utils/soundPref";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { StaffRole } from "@/types";

interface StaffHeaderProps {
  restaurantName: string | null;
  staffName: string;
  role: StaffRole;
}

/** Counter pages get the Counter artboard's one-row header; every other shell page the Admin artboard's. */
export function StaffHeader(props: StaffHeaderProps) {
  const pathname = usePathname() ?? "/";
  return isCounterPath(pathname) ? <CounterHeader {...props} pathname={pathname} /> : <AdminHeader {...props} pathname={pathname} />;
}

function Restaurant({ name, caption }: { name: string | null; caption: string }) {
  if (!name) return <BrandMark size={38} withName />;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <RestaurantInitial name={name} size={38} solid />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-base font-extrabold">{name}</span>
        <span className="text-[11px] font-semibold text-text-muted">{caption}</span>
      </span>
    </div>
  );
}

function AdminHeader({ restaurantName, staffName, role, pathname }: StaffHeaderProps & { pathname: string }) {
  const { t } = useI18n();
  const current = activeHref(ADMIN_NAV, pathname);

  return (
    <header className="border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-2.5 px-[clamp(16px,3vw,32px)] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Restaurant name={restaurantName} caption={`${t(`role.${role}`)} · ${t("common.onJamavat")}`} />
          <AccountMenu
            name={staffName}
            role={role}
            label={staffName}
            links={[
              { href: "/counter", label: "account.openCounter" },
              { href: "/kitchen", label: "account.openKitchen" },
            ]}
          />
        </div>
        <nav aria-label={t("nav.admin")} className="no-scrollbar -mx-1 flex gap-0.5 overflow-x-auto">
          {ADMIN_NAV.map((item) => {
            const active = item.href === current;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-3.5 py-3 text-sm ${active ? "border-brand font-extrabold text-brand-dark" : "border-transparent font-semibold text-stone-700"}`}
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

function CounterHeader({ restaurantName, staffName, role, pathname }: StaffHeaderProps & { pathname: string }) {
  const { t } = useI18n();
  const current = activeHref(COUNTER_NAV, pathname);
  const { state } = useRealtime({});
  const [soundOn, toggleSound] = useSoundPref(COUNTER_SOUND);

  return (
    <header className="border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-5 gap-y-3 px-[clamp(16px,3vw,32px)] py-3">
        <Restaurant name={restaurantName} caption={t("common.onJamavat")} />
        <nav aria-label={t("nav.counter")} className="flex flex-grow flex-wrap gap-1">
          {COUNTER_NAV.map((item) => {
            const active = item.href === current;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-[10px] px-3.5 py-2.5 text-sm ${active ? "bg-stone-900 font-bold text-white" : "font-semibold text-stone-700 hover:bg-surface-muted"}`}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <RealtimeStatus state={state} />
          <IconButton size="md" onClick={toggleSound} aria-pressed={soundOn} label={soundOn ? t("account.soundOn") : t("account.soundOff")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              {soundOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m22 9-6 6M16 9l6 6" />}
            </svg>
          </IconButton>
          <AccountMenu
            name={staffName}
            role={role}
            avatar="light"
            links={role === "ADMIN" ? [{ href: "/today", label: "account.openAdmin" }, { href: "/kitchen", label: "account.openKitchen" }] : []}
          />
        </div>
      </div>
    </header>
  );
}
