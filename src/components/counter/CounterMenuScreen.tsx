"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { SoldOutList, withSoldOut } from "@/components/menu/SoldOutList";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Alert } from "@/components/ui/Alert";
import type { MenuDTO } from "@/types";

/** Counter "Menu" tab: mark dishes sold out for the day (only the admin edits the menu itself). */
export function CounterMenuScreen() {
  const { t } = useI18n();
  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/menu?activeOnly=1");
    if (redirectToLoginIfUnauthorized(res)) return;
    const data = await res.json().catch(() => null);
    if (res.ok) setMenus(data.menus);
    else setError(data?.error ?? t("err.menuLoad"));
    setLoading(false);
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);
  useRealtime({ [REALTIME_EVENTS.MENU_UPDATED]: load }, load);

  async function toggle(itemId: string, soldOut: boolean) {
    setError(null);
    setMenus((prev) => withSoldOut(prev, itemId, soldOut));
    const res = await fetch(`/api/menu/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !soldOut }),
    });
    if (redirectToLoginIfUnauthorized(res)) return;
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? t("err.saveFailed"));
      void load();
    }
  }

  const groups = menus.flatMap((menu) => menu.categories.filter((category) => category.items.length > 0).map((category) => ({ menu, category })));
  const soldOut = groups.reduce((sum, { category }) => sum + category.items.filter((item) => !item.isAvailable).length, 0);

  return (
    <>
      <div className="flex max-w-[680px] flex-col gap-1.5">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t("counterMenu.title")}</h1>
        <p className="text-[15px] leading-relaxed text-text-muted">{t("counterMenu.subtitle")}</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {loading ? (
        <LoadingState />
      ) : groups.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-stone-300 bg-surface px-6 py-12 text-center text-[15px] text-text-muted">{t("guest.menuEmpty")}</div>
      ) : (
        <section className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-extrabold">{t("kitchen.soldOutTitle")}</h2>
            <span className="text-[13px] text-text-muted">{soldOut === 0 ? t("counterMenu.noneSoldOut") : t("counterMenu.soldOutCount", { n: soldOut })}</span>
          </div>
          <div className="grid gap-x-8 md:grid-cols-2">
            <div className="flex flex-col">
              <SoldOutList groups={groups.filter((_, i) => i % 2 === 0)} showMenuName={menus.length > 1} onToggle={toggle} />
            </div>
            <div className="flex flex-col">
              <SoldOutList groups={groups.filter((_, i) => i % 2 === 1)} showMenuName={menus.length > 1} onToggle={toggle} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
