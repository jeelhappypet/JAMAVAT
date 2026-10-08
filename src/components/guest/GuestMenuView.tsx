"use client";

import { useEffect, useMemo, useState } from "react";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { VegMark } from "@/components/menu/VegMark";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { GuestStateDTO, MenuDTO } from "@/types";

interface GuestMenuViewProps {
  restaurantName: string;
  state: GuestStateDTO;
  menus: MenuDTO[];
  cart: Record<string, number>;
  onQty: (id: string, delta: number) => void;
  count: number;
  total: number;
  /** Another guest holds this QR — look, don't order. */
  readOnly: boolean;
  onCart: () => void;
  onOrders: () => void;
}

/** "1 · Table menu" artboard: menu tabs only when there's more than one menu. */
export function GuestMenuView({ restaurantName, state, menus, cart, onQty, count, total, readOnly, onCart, onOrders }: GuestMenuViewProps) {
  const { t, lang } = useI18n();
  const [activeMenuId, setActiveMenuId] = useState(menus[0]?.id);
  const [query, setQuery] = useState("");

  const menu = menus.find((m) => m.id === activeMenuId) ?? menus[0];
  const q = query.trim().toLowerCase();
  const sections = useMemo(() => {
    if (!menu) return [];
    return menu.categories
      .map((category) => ({
        category,
        items: category.items.filter((item) => !q || item.name.toLowerCase().includes(q) || item.nameGu?.toLowerCase().includes(q)),
      }))
      .filter((section) => section.items.length > 0);
  }, [menu, q]);

  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);

  // The chip for the section being read turns dark, like the artboard's first chip.
  useEffect(() => {
    if (!menu) return;
    const ids = menu.categories.map((category) => `cat-${category.id}`);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCat(visible.target.id.slice(4));
      },
      { rootMargin: "-90px 0px -55% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [menu, q]);

  const subtitle = [t("guest.table", { code: state.seatCode }), state.area].filter(Boolean).join(" · ");
  const name = (entry: { name: string; nameGu?: string }) => localName(lang, entry.name, entry.nameGu);
  const other = (entry: { name: string; nameGu?: string }) => (lang === "gu" ? (entry.nameGu ? entry.name : undefined) : entry.nameGu);

  return (
    <div className="relative flex min-h-full w-full max-w-[480px] flex-col bg-background">
      <GuestHeader restaurantName={restaurantName} subtitle={subtitle} showLang />

      <main className="flex flex-1 flex-col gap-3.5 px-4 pb-28 pt-3.5">
        {readOnly ? (
          <div className="rounded-[14px] bg-brand-light px-4 py-3 text-sm font-semibold text-orange-900">{t("guest.browseOnly")}</div>
        ) : null}

        {state.orders.length > 0 && !readOnly ? (
          <button type="button" onClick={onOrders} className="flex h-11 items-center justify-between rounded-xl border border-brand bg-orange-50 px-4 text-sm font-bold text-brand-dark">
            {t("guest.myOrders", { n: state.orders.length })}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        ) : null}

        <label className="flex h-12 items-center gap-2.5 rounded-[14px] border border-border bg-surface px-3.5 text-text-muted">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("guest.search")}
            placeholder={t("guest.search")}
            className="flex-grow bg-transparent text-[15px] text-foreground outline-none"
          />
        </label>

        {menus.length > 1 ? (
          <div className="flex gap-1 rounded-[14px] bg-stone-200/70 p-1">
            {menus.map((entry) => {
              const active = entry.id === menu?.id;
              const items = entry.categories.reduce((sum, c) => sum + c.items.length, 0);
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveMenuId(entry.id)}
                  className={`flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[11px] text-[15px] font-bold ${active ? "bg-surface text-brand-dark shadow-sm" : "text-stone-700"}`}
                >
                  {name(entry)}
                  <span className="text-xs font-semibold text-text-muted">{items}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {menu && !q && menu.categories.length > 1 ? (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {menu.categories.map((category) => {
              const current = menu.categories.some((c) => c.id === activeCat) ? activeCat : menu.categories[0]?.id;
              const on = current === category.id;
              return (
                <a
                  key={category.id}
                  href={`#cat-${category.id}`}
                  onClick={() => setActiveCat(category.id)}
                  aria-current={on ? "true" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold ${on ? "border-stone-900 bg-stone-900 text-white" : "border-border bg-surface text-foreground"}`}
                >
                  {name(category)}
                </a>
              );
            })}
          </div>
        ) : null}

        {menus.length === 0 ? <p className="py-10 text-center text-[15px] text-text-muted">{t("guest.menuEmpty")}</p> : null}
        {menus.length > 0 && sections.length === 0 && q ? <p className="py-10 text-center text-[15px] text-text-muted">{t("guest.noResults", { q: query.trim() })}</p> : null}

        {sections.map(({ category, items }) => (
          <section key={category.id} id={`cat-${category.id}`} className="flex scroll-mt-20 flex-col gap-2.5">
            <h2 className="mt-1 text-lg font-extrabold tracking-tight">{name(category)}</h2>
            {items.map((item) => {
              const qty = cart[item.id] ?? 0;
              return (
                <article key={item.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-3.5">
                  <div className="flex min-w-0 flex-grow flex-col gap-[3px]">
                    <div className="flex items-center gap-2">
                      <VegMark isVeg={item.isVeg} label={item.isVeg ? t("menu.veg") : t("menu.nonVeg")} />
                      {item.isBestseller ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-800">{t("guest.bestseller")}</span> : null}
                    </div>
                    <span className="text-base font-bold leading-snug">{name(item)}</span>
                    {other(item) ? <span className="text-[13px] text-text-muted">{other(item)}</span> : null}
                    {item.description ? <span className="text-[13px] leading-relaxed text-text-muted">{localName(lang, item.description, item.descriptionGu)}</span> : null}
                    <span className="mt-1 text-[15px] font-extrabold">₹{item.price}</span>
                  </div>
                  <div className="flex w-24 shrink-0 flex-col items-center justify-center">
                    {!item.isAvailable ? (
                      <span className="text-sm font-bold text-danger">{t("menu.soldOut")}</span>
                    ) : readOnly ? null : qty === 0 ? (
                      <button type="button" onClick={() => onQty(item.id, 1)} className="h-10 w-24 rounded-[10px] border-[1.5px] border-brand bg-surface text-sm font-extrabold tracking-wide text-brand">
                        {t("guest.add")}
                      </button>
                    ) : (
                      <div className="flex h-10 w-24 items-center justify-between rounded-[10px] bg-brand text-white">
                        <button type="button" onClick={() => onQty(item.id, -1)} aria-label={t("guest.removeOne")} className="h-10 w-8 text-xl font-bold">
                          −
                        </button>
                        <span className="text-[15px] font-extrabold">{qty}</span>
                        <button type="button" onClick={() => onQty(item.id, 1)} aria-label={t("guest.addOne")} className="h-10 w-8 text-xl font-bold">
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        ))}

        <p className="mt-2 text-center text-xs text-text-muted">
          {t("guest.poweredBy")} <strong className="text-foreground">Jamavat</strong>
        </p>
      </main>

      <div className="fixed bottom-3 left-1/2 z-30 w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2">
        {count > 0 && !readOnly ? (
          <button
            type="button"
            onClick={onCart}
            className="flex min-h-[60px] w-full items-center justify-between gap-3 rounded-2xl bg-brand px-[18px] py-3 text-white shadow-[0_10px_24px_rgba(154,52,18,0.32)]"
          >
            <span className="flex flex-col items-start">
              <span className="text-[13px] font-semibold">{count === 1 ? t("guest.itemsOne") : t("guest.items", { n: count })}</span>
              <span className="text-[19px] font-extrabold">₹{total}</span>
            </span>
            <span className="flex items-center gap-1.5 text-base font-extrabold">
              {t("guest.viewCart")}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="M3 10h18" />
            </svg>
            {t("guest.payNote")}
          </div>
        )}
      </div>
    </div>
  );
}
