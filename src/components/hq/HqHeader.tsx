"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";

const TABS = [
  { href: "/hq", label: "Restaurants" },
  { href: "/hq/inquiries", label: "Inquiries" },
  { href: "/hq/plans", label: "Plans" },
];

/** HQ's own dark header — deliberately unlike a restaurant's, so it's obvious where you are. */
export function HqHeader({ email }: { email: string }) {
  const pathname = usePathname() ?? "/hq";
  const current = TABS.filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  async function logout() {
    await fetch("/api/hq/auth/logout", { method: "POST" }).catch(() => null);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/hq/login");
  }

  return (
    <header className="bg-stone-900 text-white">
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-2.5 px-[clamp(16px,3vw,32px)] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <BrandMark size={38} />
            <span className="text-[17px] font-extrabold">
              Jamavat <span className="font-semibold text-stone-300">HQ</span>
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] font-semibold text-stone-300 sm:inline">{email}</span>
            <Button variant="outlineDark" size="sm" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
        <nav aria-label="HQ" className="-mx-1 flex gap-0.5 overflow-x-auto">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.href === current ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3.5 py-3 text-sm ${
                tab.href === current ? "border-orange-400 font-extrabold text-white" : "border-transparent font-semibold text-stone-300"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
