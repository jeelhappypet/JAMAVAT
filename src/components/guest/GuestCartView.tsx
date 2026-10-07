"use client";

import { GuestHeader } from "@/components/guest/GuestHeader";
import { VegMark } from "@/components/menu/VegMark";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { GuestStateDTO, MenuDTO } from "@/types";

interface GuestCartViewProps {
  restaurantName: string;
  state: GuestStateDTO;
  menus: MenuDTO[];
  cart: Record<string, number>;
  note: string;
  onNote: (note: string) => void;
  onQty: (id: string, delta: number) => void;
  count: number;
  total: number;
  placing: boolean;
  error: string | null;
  onBack: () => void;
  onPlace: () => void;
  onForget: () => void;
}

/** "2 · Cart" artboard: dishes grouped by the kitchen (menu) they go to, plus the cooking note. */
export function GuestCartView({ restaurantName, state, menus, cart, note, onNote, onQty, count, total, placing, error, onBack, onPlace, onForget }: GuestCartViewProps) {
  const { t, lang } = useI18n();

  const groups = menus
    .map((menu) => ({
      menu,
      items: menu.categories.flatMap((category) => category.items).filter((item) => item.isAvailable && (cart[item.id] ?? 0) > 0),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="relative flex min-h-full w-full max-w-[480px] flex-col bg-background">
      <GuestHeader restaurantName={restaurantName} title={t("guest.yourOrder")} subtitle={`${t("guest.table", { code: state.seatCode })} · ${restaurantName}`} onBack={onBack} />

      <main className="flex flex-1 flex-col gap-3.5 px-4 pb-40 pt-4">
        {count === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-lg font-bold">{t("guest.cartEmpty")}</p>
            <button type="button" onClick={onBack} className="h-11 rounded-xl border border-brand px-5 text-sm font-bold text-brand">
              {t("guest.browseMenu")}
            </button>
          </div>
        ) : (
          <>
            {groups.map(({ menu, items }) => (
              <section key={menu.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[15px] font-extrabold">{localName(lang, menu.name, menu.nameGu)}</h2>
                  {menus.length > 1 ? <span className="text-xs text-text-muted">{t("guest.goesTo", { menu: localName(lang, menu.name, menu.nameGu) })}</span> : null}
                </div>
                {items.map((item) => {
                  const qty = cart[item.id] ?? 0;
                  return (
                    <div key={item.id} className="flex items-center gap-2.5">
                      <VegMark isVeg={item.isVeg} label={item.isVeg ? t("menu.veg") : t("menu.nonVeg")} />
                      <div className="flex min-w-0 flex-grow flex-col">
                        <span className="line-clamp-2 text-[15px] font-bold leading-snug">{localName(lang, item.name, item.nameGu)}</span>
                        <span className="text-[13px] text-text-muted">{t("guest.each", { price: item.price })}</span>
                      </div>
                      <div className="flex h-9 items-center rounded-[10px] border border-border">
                        <button type="button" onClick={() => onQty(item.id, -1)} aria-label={t("guest.removeOne")} className="h-9 w-8 text-lg text-brand">
                          −
                        </button>
                        <span className="min-w-[18px] text-center text-sm font-extrabold">{qty}</span>
                        <button type="button" onClick={() => onQty(item.id, 1)} aria-label={t("guest.addOne")} className="h-9 w-8 text-lg text-brand">
                          +
                        </button>
                      </div>
                      <span className="w-14 text-right text-[15px] font-bold tabular-nums">₹{item.price * qty}</span>
                    </div>
                  );
                })}
              </section>
            ))}

            <label className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3.5">
              <span className="text-sm font-bold">
                {t("guest.note")} <span className="font-medium text-text-muted">{t("guest.optional")}</span>
              </span>
              <textarea
                rows={2}
                maxLength={200}
                value={note}
                onChange={(e) => onNote(e.target.value)}
                placeholder={t("guest.notePlaceholder")}
                className="resize-none rounded-[10px] border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
              />
            </label>

            <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3.5">
              <div className="flex justify-between text-sm text-text-muted">
                <span>{t("guest.itemTotal")}</span>
                <span>₹{total}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-border pt-2.5 text-[17px] font-extrabold">
                <span>{t("guest.toPay")}</span>
                <span>₹{total}</span>
              </div>
            </section>

            <div className="flex items-start gap-2.5 rounded-[14px] bg-brand-light px-3.5 py-3 text-[13px] leading-relaxed text-orange-900">
              <svg className="mt-px shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8h.01M11 12h1v5h1" />
              </svg>
              <span>{t("guest.confirmInfo")}</span>
            </div>

            {error ? (
              <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
                {error}
              </div>
            ) : null}
          </>
        )}
      </main>

      {count > 0 ? (
        <div className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[480px] -translate-x-1/2 flex-col gap-2 border-t border-border bg-surface px-4 pb-4 pt-3">
          {state.verifiedEmail ? (
            <p className="text-center text-xs text-text-muted">
              {t("guest.verifiedAs", { email: state.verifiedEmail })} ·{" "}
              <button type="button" onClick={onForget} className="font-bold text-brand underline-offset-2 hover:underline">
                {t("guest.notYou")}
              </button>
            </p>
          ) : null}
          <button type="button" onClick={onPlace} disabled={placing} className="flex h-14 items-center justify-center rounded-2xl bg-brand text-[17px] font-extrabold text-white disabled:opacity-60">
            {placing ? t("guest.placing") : t("guest.placeOrder", { total })}
          </button>
        </div>
      ) : null}
    </div>
  );
}
