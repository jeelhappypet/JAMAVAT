"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { VegMark } from "@/components/menu/VegMark";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { GuestCartBar } from "@/components/guest/GuestCartBar";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { DishPhoto } from "@/components/menu/DishPhoto";
import { localName } from "@/lib/i18n/messages";
import type { GstSettingsDTO, GuestStateDTO, MenuDTO } from "@/types";

interface GuestMenuViewProps {
  restaurantName: string;
  state: GuestStateDTO;
  /** Names the GST on the cart bar, so the cart screen's total isn't a jump. */
  gst: GstSettingsDTO;
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

/**
 * "1 · Menu" artboard. Header, search, menu tabs and category chips stay put;
 * only the dish list scrolls (the page itself never does). Menu tabs only
 * when there's more than one menu.
 */
export function GuestMenuView({ restaurantName, state, gst, menus, cart, onQty, count, total, readOnly, onCart, onOrders }: GuestMenuViewProps) {
  const { t, lang } = useI18n();
  const [activeMenuId, setActiveMenuId] = useState(menus[0]?.id);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

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

  const currentCat = sections.some((s) => s.category.id === activeCat) ? activeCat : sections[0]?.category.id;
  const matchCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  // The chip of the section being read turns dark (scroll-spy inside the list, not the page).
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCat(visible.target.id.slice(4));
      },
      { root, rootMargin: "0px 0px -70% 0px" }
    );
    root.querySelectorAll("section[id^='cat-']").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // Keep the dark chip in view when the list scrolls past the chips the row can show.
  useEffect(() => {
    chipsRef.current?.querySelector<HTMLElement>(`[data-cat="${currentCat}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [currentCat]);

  function jumpTo(categoryId: string) {
    setActiveCat(categoryId);
    document.getElementById(`cat-${categoryId}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function pickMenu(id: string) {
    setActiveMenuId(id);
    setActiveCat(undefined);
    listRef.current?.scrollTo({ top: 0 });
  }

  const subtitle = [t("guest.table", { code: state.seatCode }), state.area].filter(Boolean).join(" · ");
  const name = (entry: { name: string; nameGu?: string }) => localName(lang, entry.name, entry.nameGu);
  const other = (entry: { name: string; nameGu?: string }) => (lang === "gu" ? (entry.nameGu ? entry.name : undefined) : entry.nameGu);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-background">
      <GuestHeader restaurantName={restaurantName} subtitle={subtitle} showLang />

      <div className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 pb-3 pt-3">
        {readOnly ? <Alert tone="warning">{t("guest.browseOnly")}</Alert> : null}

        {state.orders.length > 0 && !readOnly ? (
          <button type="button" onClick={onOrders} className="flex h-11 items-center justify-between rounded-xl border border-brand bg-brand-light px-4 text-sm font-bold text-brand-dark">
            {t("guest.myOrders", { n: state.orders.length })}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        ) : null}

        <SearchField
          value={query}
          onChange={setQuery}
          label={t("guest.search")}
          clearLabel={t("pos.searchClear")}
          resultCount={matchCount}
          resultLabel={matchCount === 1 ? t("pos.searchResultsOne") : t("pos.searchResults", { n: matchCount })}
        />

        {menus.length > 1 ? (
          <SegmentedControl
            size="lg"
            label={t("guest.menus")}
            value={menu?.id ?? ""}
            onChange={pickMenu}
            options={menus.map((entry) => ({ value: entry.id, label: name(entry), count: entry.categories.reduce((sum, c) => sum + c.items.length, 0) }))}
          />
        ) : null}

        {sections.length > 1 ? (
          <div ref={chipsRef} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {sections.map(({ category }) => {
              const on = currentCat === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  data-cat={category.id}
                  aria-pressed={on}
                  onClick={() => jumpTo(category.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold ${on ? "border-ink bg-ink text-white" : "border-border bg-surface text-foreground"}`}
                >
                  {name(category)}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain px-4 pb-28 pt-3">
        {menus.length === 0 ? <p className="py-10 text-center text-[15px] text-text-muted">{t("guest.menuEmpty")}</p> : null}
        {menus.length > 0 && sections.length === 0 && q ? <p className="py-10 text-center text-[15px] text-text-muted">{t("guest.noResults", { q: query.trim() })}</p> : null}

        {sections.map(({ category, items }) => (
          <section key={category.id} id={`cat-${category.id}`} className="flex scroll-mt-3 flex-col gap-2.5">
            <h2 className="text-lg font-extrabold tracking-tight">{name(category)}</h2>
            {items.map((item) => {
              const qty = cart[item.id] ?? 0;
              return (
                <article key={item.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-3.5">
                  <div className="flex min-w-0 flex-grow flex-col gap-[3px]">
                    <div className="flex items-center gap-2">
                      <VegMark isVeg={item.isVeg} label={item.isVeg ? t("menu.veg") : t("menu.nonVeg")} />
                      {item.isBestseller ? (
                        <Badge tone="orange" size="sm">
                          {t("guest.bestseller")}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-base font-bold leading-snug">{name(item)}</span>
                    {other(item) ? <span className="text-[13px] text-text-muted">{other(item)}</span> : null}
                    {item.description ? <span className="text-[13px] leading-relaxed text-text-muted">{localName(lang, item.description, item.descriptionGu)}</span> : null}
                    <span className="mt-1 text-[15px] font-extrabold">₹{item.price}</span>
                  </div>
                  <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-2">
                    {item.imageUrl ? <DishPhoto src={item.imageUrl} alt={name(item)} className={item.isAvailable ? undefined : "opacity-50 grayscale"} /> : null}
                    {!item.isAvailable ? (
                      <span className="text-sm font-bold text-danger">{t("menu.soldOut")}</span>
                    ) : readOnly ? null : qty === 0 ? (
                      <Button variant="outline" size="sm" className="w-24 tracking-wide" onClick={() => onQty(item.id, 1)}>
                        {t("guest.add")}
                      </Button>
                    ) : (
                      <QuantityStepper value={qty} onChange={(delta) => onQty(item.id, delta)} decreaseLabel={t("guest.removeOne")} increaseLabel={t("guest.addOne")} />
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        ))}

        <p className="text-center text-xs text-text-muted">
          {t("guest.poweredBy")} <strong className="text-foreground">Jamavat</strong>
        </p>
      </div>

      {/* Browsing someone else's QR: no cart, but the bar still says where to pay. */}
      <GuestCartBar count={readOnly ? 0 : count} total={total} gst={gst} onOpen={onCart} />
    </div>
  );
}
