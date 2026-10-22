"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, RestaurantInitial } from "@/components/brand/BrandMark";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { IconButton } from "@/components/ui/IconButton";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { ADMIN_NAV, COUNTER_NAV, activeHref, isCounterPath } from "@/components/shell/navItems";
import { useRestaurant } from "@/components/shell/RestaurantProvider";
import { appRelativePath } from "@/lib/auth/access";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { COUNTER_SOUND, useSoundPref } from "@/lib/utils/soundPref";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { StaffRole } from "@/types";

interface StaffHeaderProps {
  staffName: string;
  role: StaffRole;
}

/** Counter pages get the Counter artboard's one-row header; every other shell page the Admin artboard's. */
export function StaffHeader(props: StaffHeaderProps) {
  // Tabs compare restaurant-relative paths, so one header serves every restaurant's link.
  const pathname = appRelativePath(usePathname() ?? "/");
  return isCounterPath(pathname) ? <CounterHeader {...props} pathname={pathname} /> : <AdminHeader {...props} pathname={pathname} />;
}

function Restaurant({ caption }: { caption: string }) {
  const { name } = useRestaurant();
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

function AdminHeader({ staffName, role, pathname }: StaffHeaderProps & { pathname: string }) {
  const { t } = useI18n();
  const { path } = useRestaurant();
  const current = activeHref(ADMIN_NAV, pathname);

  return (
    <header className="border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-2.5 px-[clamp(16px,3vw,32px)] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Restaurant caption={`${t(`role.${role}`)} · ${t("common.onJamavat")}`} />
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
        {/* Six tabs don't fit one phone row, and a hidden side-scroller leaves
            half of them undiscoverable — so phones get a two-row grid of short
            labels, and the artboard's single underline row returns at sm. */}
        <nav aria-label={t("nav.admin")} className="-mx-1 grid grid-cols-3 sm:flex sm:gap-0.5">
          {ADMIN_NAV.map((item) => {
            const active = item.href === current;
            return (
              <Link
                key={item.href}
                href={path(item.href)}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-2 py-3 text-center text-sm sm:px-3.5 sm:text-left ${active ? "border-brand font-extrabold text-brand-dark" : "border-transparent font-semibold text-text-muted"}`}
              >
                <span className="sm:hidden">{t(item.shortLabel ?? item.label)}</span>
                <span className="hidden sm:inline">{t(item.label)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function CounterHeader({ staffName, role, pathname }: StaffHeaderProps & { pathname: string }) {
  const { t } = useI18n();
  const { path } = useRestaurant();
  const current = activeHref(COUNTER_NAV, pathname);
  const { state } = useRealtime({});
  const [soundOn, toggleSound] = useSoundPref(COUNTER_SOUND);

  return (
    <header className="border-b border-border bg-surface print:hidden">
      {/* On a 390px phone this used to wrap into three rows — name, tabs,
          controls — and eat a fifth of the screen above a till. The name and
          the controls now share the first row and the tabs get their own,
          scrolling sideways rather than wrapping. */}
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-5 gap-y-2 px-[clamp(16px,3vw,32px)] py-2.5 sm:gap-y-3 sm:py-3">
        <div className="min-w-0 flex-1 sm:flex-none">
          <Restaurant caption={t("common.onJamavat")} />
        </div>
        <nav aria-label={t("nav.counter")} className="no-scrollbar order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:order-none sm:mx-0 sm:w-auto sm:flex-grow sm:overflow-x-visible sm:px-0">
          {COUNTER_NAV.map((item) => {
            const active = item.href === current;
            return (
              <Link
                key={item.href}
                href={path(item.href)}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-sm transition-colors ${active ? "bg-ink font-bold text-white" : "font-semibold text-text-muted hover:bg-surface-muted"}`}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {/* The global OfflineIndicator already shouts when the connection
              drops, so this badge is the roomy-screen version of the same news. */}
          <span className="hidden sm:inline-flex">
            <RealtimeStatus state={state} />
          </span>
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
