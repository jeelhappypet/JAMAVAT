"use client";

import { BrandMark, RestaurantInitial } from "@/components/brand/BrandMark";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";

/** Header for the logged-out screens (login, setup) — matches the "Staff PIN login" artboard. */
export function AuthHeader({ restaurantName }: { restaurantName: string | null }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-[clamp(16px,3vw,32px)] py-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark withName />
        {restaurantName ? (
          <>
            <span className="h-6 w-px bg-stone-300" aria-hidden />
            <span className="flex min-w-0 items-center gap-2">
              <RestaurantInitial name={restaurantName} />
              <span className="truncate text-[15px] font-bold">{restaurantName}</span>
            </span>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LanguageToggle />
        <InstallAppButton />
      </div>
    </header>
  );
}
