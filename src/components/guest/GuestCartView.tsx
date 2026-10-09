"use client";

import { GuestHeader } from "@/components/guest/GuestHeader";
import { VegMark } from "@/components/menu/VegMark";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { TextArea } from "@/components/ui/TextField";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
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
    <div className="relative flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      <GuestHeader restaurantName={restaurantName} title={t("guest.yourOrder")} subtitle={`${t("guest.table", { code: state.seatCode })} · ${restaurantName}`} onBack={onBack} />

      <main className="flex flex-1 flex-col gap-3.5 px-4 pb-32 pt-4">
        {count === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-lg font-bold">{t("guest.cartEmpty")}</p>
            <Button variant="outline" onClick={onBack}>
              {t("guest.browseMenu")}
            </Button>
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
                      <QuantityStepper tone="outline" value={qty} onChange={(delta) => onQty(item.id, delta)} decreaseLabel={t("guest.removeOne")} increaseLabel={t("guest.addOne")} />
                      <span className="w-14 text-right text-[15px] font-bold tabular-nums">₹{item.price * qty}</span>
                    </div>
                  );
                })}
              </section>
            ))}

            <TextArea
              className="rounded-2xl border border-border bg-surface px-4 py-3.5"
              label={
                <span>
                  {t("guest.note")} <span className="font-medium text-text-muted">{t("guest.optional")}</span>
                </span>
              }
              maxLength={200}
              value={note}
              onChange={(e) => onNote(e.target.value)}
              placeholder={t("guest.notePlaceholder")}
            />

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

            {error ? <Alert>{error}</Alert> : null}
          </>
        )}
      </main>

      {count > 0 ? (
        <div className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[480px] -translate-x-1/2 flex-col gap-2 border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {state.verifiedEmail ? (
            <p className="text-center text-xs text-text-muted">
              {t("guest.verifiedAs", { email: state.verifiedEmail })} ·{" "}
              <Button variant="link" size="inline" onClick={onForget}>
                {t("guest.notYou")}
              </Button>
            </p>
          ) : null}
          <Button size="xl" fullWidth onClick={onPlace} disabled={placing}>
            {placing ? t("guest.placing") : t("guest.placeOrder", { total })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
