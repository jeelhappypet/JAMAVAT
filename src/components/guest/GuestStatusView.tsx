"use client";

import { GuestHeader } from "@/components/guest/GuestHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatClock } from "@/lib/utils/time";
import { localName } from "@/lib/i18n/messages";
import { billTotals, halfPercent } from "@/lib/gst";
import type { GstSettingsDTO, GuestStateDTO, MenuDTO, OrderDTO } from "@/types";

interface GuestStatusViewProps {
  restaurantName: string;
  state: GuestStateDTO;
  /** Adds "GST x% is added at the counter" under the running total. */
  gst: GstSettingsDTO;
  /** Current menu — names each item's kitchen in the guest's language. */
  menus: MenuDTO[];
  onOrderMore: () => void;
}

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * After ordering: a plain "it'll be served in a few minutes" (no step-by-step
 * status — the owner wants it simple), the newest order's items per kitchen,
 * earlier orders, and the running total.
 */
export function GuestStatusView({ restaurantName, state, gst, menus, onOrderMore }: GuestStatusViewProps) {
  const { t, lang } = useI18n();
  const orders = [...state.orders].reverse();
  const latest = orders[0];
  const billable = state.orders.filter((order) => order.status !== "CANCELLED");
  const itemsTotal = billable.reduce((sum, order) => sum + order.totalAmount, 0);
  // Worked out on the whole sitting, which is what the counter settles — so
  // this is the figure the guest will be asked for (less any discount the
  // counter gives them).
  const { tax, total } = billTotals(itemsTotal, 0, gst);
  const clock = (iso: string) => formatClock(iso, lang);

  const kitchenOf = new Map<string, string>();
  menus.forEach((menu) => menu.categories.forEach((category) => kitchenOf.set(category.id, localName(lang, menu.name, menu.nameGu))));
  const groupsOf = (order: OrderDTO) => {
    const groups = new Map<string, OrderDTO["items"]>();
    for (const item of order.items) {
      const kitchen = (item.categoryId && kitchenOf.get(item.categoryId)) || item.categorySnapshot;
      groups.set(kitchen, [...(groups.get(kitchen) ?? []), item]);
    }
    return [...groups];
  };
  const itemName = (item: OrderDTO["items"][number]) => localName(lang, item.nameSnapshot, item.nameGuSnapshot);

  if (!latest) {
    const settled = state.ended?.reason === "SETTLED";
    return (
      <div className="flex min-h-dvh w-full flex-col bg-background">
        <GuestHeader restaurantName={restaurantName} subtitle={[t("guest.table", { code: state.seatCode }), state.area].filter(Boolean).join(" · ")} />
        <main className="flex flex-1 flex-col items-center gap-[18px] px-6 pb-6 pt-10 text-center">
          <span className={`flex h-[84px] w-[84px] items-center justify-center rounded-[26px] ${settled ? "bg-success-light text-success" : "bg-brand-light text-brand"}`}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {settled ? <path d="M5 13l4 4L19 7" /> : <path d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
            </svg>
          </span>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{settled ? t("guest.thanksTitle") : t("guest.sessionEndedTitle")}</h1>
          <p className="max-w-[320px] text-[15px] leading-relaxed text-text-muted">{settled ? t("guest.thanksBody") : t("guest.sessionEnded")}</p>
          <Button variant="outline" size="xl" fullWidth className="mt-2" onClick={onOrderMore}>
            {t("guest.backToMenu")}
          </Button>
        </main>
      </div>
    );
  }

  const groups = groupsOf(latest);
  const cancelled = latest.status === "CANCELLED";

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <GuestHeader
        restaurantName={restaurantName}
        title={t("guest.orderTitle", { n: latest.tokenNumber })}
        subtitle={`${restaurantName} · ${t("guest.table", { code: state.seatCode })}`}
        trailing={
          <Badge>
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
            {t("realtime.live")}
          </Badge>
        }
      />

      <main className="flex flex-1 flex-col gap-3.5 px-4 pb-6 pt-4">
        <section className="flex items-start gap-3.5 rounded-[18px] border border-border bg-surface p-[18px]">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${cancelled ? "bg-danger-light text-danger" : "bg-brand-light text-brand"}`}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {cancelled ? <path d="M18 6 6 18M6 6l12 12" /> : <><path d="M3 18h18" /><path d="M5 18a7 7 0 0 1 14 0" /><path d="M12 8V6M10 6h4" /></>}
            </svg>
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">{cancelled ? t("guest.statusCancelled") : t("guest.placedTitle")}</h1>
            <p className="text-[14px] leading-relaxed text-text-muted">{cancelled ? t("guest.statusCancelledBody") : t("guest.placedBody")}</p>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-4">
          {groups.map(([kitchen, items], index) => (
            <div key={kitchen} className="flex flex-col gap-3">
              {index > 0 ? <div className="h-px bg-border" /> : null}
              <h2 className="text-[15px] font-extrabold">{kitchen}</h2>
              {items.map((item, i) => (
                <div key={`${item.menuItemId}-${i}`} className="flex justify-between text-sm">
                  <span>{itemName(item)}</span>
                  <span className="text-text-muted">× {item.quantity}</span>
                </div>
              ))}
            </div>
          ))}
          {latest.note ? (
            <div className="rounded-[10px] bg-brand-light px-3 py-2 text-[13px] text-brand-dark">
              <strong>{t("guest.yourNote")}</strong> {latest.note}
            </div>
          ) : null}
        </section>

        <Button
          variant="outline"
          size="xl"
          fullWidth
          onClick={onOrderMore}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          }
        >
          {t("guest.orderMore")}
        </Button>

        {orders.length > 1 ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-extrabold text-text-muted">{t("guest.earlierOrders")}</h2>
            {orders.slice(1).map((order) => (
              <div key={order.id} className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">
                    {t("guest.orderTitle", { n: order.tokenNumber })} <span className="font-semibold text-text-muted">· {clock(order.createdAt)}</span>
                  </span>
                  {order.status === "CANCELLED" ? (
                    <Badge tone="red" size="sm">
                      {t("guest.cancelledTag")}
                    </Badge>
                  ) : null}
                </div>
                <span className="text-[13px] text-text-muted">{order.items.map((item) => `${itemName(item)} × ${item.quantity}`).join(", ")}</span>
              </div>
            ))}
          </section>
        ) : null}

        {billable.length > 0 ? (
          <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface-muted px-4 py-3.5 text-[13px] leading-relaxed text-text-muted">
            {tax ? (
              <>
                <span className="flex justify-between">
                  <span>{t("guest.itemTotal")}</span>
                  <span>{rupees(itemsTotal)}</span>
                </span>
                {tax.mode === "CGST_SGST" ? (
                  <>
                    <span className="flex justify-between">
                      <span>{t("tax.cgst", { p: halfPercent(tax.percent) })}</span>
                      <span>{rupees(tax.cgst ?? 0)}</span>
                    </span>
                    <span className="flex justify-between">
                      <span>{t("tax.sgst", { p: halfPercent(tax.percent) })}</span>
                      <span>{rupees(tax.sgst ?? 0)}</span>
                    </span>
                  </>
                ) : (
                  <span className="flex justify-between">
                    <span>{t("tax.igst", { p: tax.percent })}</span>
                    <span>{rupees(tax.amount)}</span>
                  </span>
                )}
              </>
            ) : null}
            <span className="flex justify-between text-[15px] text-foreground">
              <strong>{t("guest.totalSoFar")}</strong>
              <strong>{rupees(total)}</strong>
            </span>
            <span>{t("guest.payAndEmail", { email: state.verifiedEmail ?? latest.guestEmail ?? "" })}</span>
          </div>
        ) : null}
      </main>
    </div>
  );
}
