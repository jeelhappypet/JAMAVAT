"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { CategoryDTO, MenuDTO } from "@/types";

/** The "Sold out today" checklist from the Kitchen artboard — also the counter's Menu tab. */
export function SoldOutList({
  groups,
  showMenuName,
  onToggle,
}: {
  groups: { menu: MenuDTO; category: CategoryDTO }[];
  showMenuName: boolean;
  onToggle: (itemId: string, soldOut: boolean) => void;
}) {
  const { lang } = useI18n();
  return (
    <>
      {groups.map(({ category, menu }) => (
        <div key={category.id} className="flex flex-col">
          <span className="pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-text-muted">
            {showMenuName ? `${localName(lang, menu.name, menu.nameGu)} · ` : ""}
            {localName(lang, category.name, category.nameGu)}
          </span>
          {category.items.map((item) => (
            <label key={item.id} className="flex min-h-11 items-center justify-between gap-2.5 border-b border-stone-100 px-1 text-[15px] font-semibold">
              <span className={item.isAvailable ? "" : "text-danger line-through decoration-2"}>{localName(lang, item.name, item.nameGu)}</span>
              <input type="checkbox" checked={!item.isAvailable} onChange={(e) => onToggle(item.id, e.target.checked)} className="h-[22px] w-[22px] accent-[#c2410c]" />
            </label>
          ))}
        </div>
      ))}
    </>
  );
}

/** Optimistically flips one dish's sold-out flag in a menu tree. */
export function withSoldOut(menus: MenuDTO[], itemId: string, soldOut: boolean): MenuDTO[] {
  return menus.map((menu) => ({
    ...menu,
    categories: menu.categories.map((category) => ({
      ...category,
      items: category.items.map((item) => (item.id === itemId ? { ...item, isAvailable: !soldOut } : item)),
    })),
  }));
}
