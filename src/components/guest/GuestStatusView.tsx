"use client";

import { GuestHeader } from "@/components/guest/GuestHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName, type MessageKey } from "@/lib/i18n/messages";
import type { GuestStateDTO, MenuDTO, OrderDTO } from "@/types";

interface GuestStatusViewProps {
  restaurantName: string;
  state: GuestStateDTO;
  /** Current menu — used to show category names in the guest's language. */
  menus: MenuDTO[];
  sessionEnded: boolean;
  onOrderMore: () => void;
}

const HEADLINES: Record<OrderDTO["status"], { title: MessageKey; eyebrow: MessageKey; tone: string; body?: MessageKey }> = {
  PLACED: { title: "guest.statusWaiting", eyebrow: "guest.stepPlaced", tone: "text-brand-dark", body: "guest.statusWaitingBody" },
  PENDING: { title: "guest.statusCooking", eyebrow: "guest.stepCooking", tone: "text-brand-dark" },
  READY: { title: "guest.statusReady", eyebrow: "guest.stepReady", tone: "text-green-800" },
  COMPLETED: { title: "guest.statusServed", eyebrow: "guest.stepReady", tone: "text-green-800" },
  REJECTED: { title: "guest.statusRejected", eyebrow: "guest.statusRejected", tone: "text-red-800", body: "guest.statusRejectedBody" },
  CANCELLED: { title: "guest.statusCancelled", eyebrow: "guest.statusCancelled", tone: "text-red-800" },
};

/** "4 · Order status" artboard: newest order on top with its timeline, items grouped with Ready/Cooking. */
export function GuestStatusView({ restaurantName, state, menus, sessionEnded, onOrderMore }: GuestStatusViewProps) {
  const { t, lang } = useI18n();
  const categories = new Map(menus.flatMap((menu) => menu.categories.map((category) => [category.id, category] as const)));
  // Orders keep an English snapshot; the live category (if it still exists) has the Gujarati name too.
  const categoryLabel = (item: OrderDTO["items"][number]) => {
    const live = item.categoryId ? categories.get(item.categoryId) : undefined;
    return localName(lang, live?.name ?? item.categorySnapshot, live?.nameGu);
  };
  const orders = [...state.orders].reverse();
  const billable = state.orders.filter((order) => order.status !== "REJECTED" && order.status !== "CANCELLED");
  const total = billable.reduce((sum, order) => sum + order.totalAmount, 0);
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(lang === "gu" ? "gu-IN" : "en-IN", { hour: "numeric", minute: "2-digit" });
  const subtitle = [t("guest.table", { code: state.seatCode }), state.area].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-full w-full max-w-[480px] flex-col bg-background">
      <GuestHeader restaurantName={restaurantName} subtitle={subtitle} />

      <main className="flex flex-1 flex-col gap-3.5 px-4 pb-8 pt-4">
        {sessionEnded ? (
          <div className="rounded-[18px] border border-border bg-surface px-5 py-8 text-center text-[15px] leading-relaxed text-stone-700">{t("guest.sessionEnded")}</div>
        ) : null}

        {orders.map((order, index) => {
          const head = HEADLINES[order.status];
          const ready = order.items.filter((item) => item.status === "READY").length;
          const groups = order.items.reduce<Record<string, OrderDTO["items"]>>((acc, item) => {
            (acc[categoryLabel(item)] ??= []).push(item);
            return acc;
          }, {});
          const showTimeline = index === 0 && ["PLACED", "PENDING", "READY", "COMPLETED"].includes(order.status);
          return (
            <section key={order.id} className="flex flex-col gap-4 rounded-[18px] border border-border bg-surface p-[18px]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className={`text-[13px] font-bold uppercase tracking-wide ${head.tone}`}>{t("guest.orderNo", { n: order.tokenNumber })}</span>
                  <h1 className={`${index === 0 ? "text-2xl" : "text-lg"} font-extrabold leading-tight tracking-tight`}>{t(head.title)}</h1>
                  {head.body ? <span className="text-[13px] text-text-muted">{t(head.body)}</span> : null}
                  {index === 0 && !head.body && (order.status === "PENDING" || order.status === "PLACED") ? (
                    <span className="text-[13px] text-text-muted">{t("guest.autoUpdate")}</span>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-text-muted">{clock(order.createdAt)}</span>
              </div>

              {showTimeline ? (
                <ol className="flex flex-col">
                  <Step done label={t("guest.stepPlaced")} time={clock(order.createdAt)} />
                  <Step done={order.status !== "PLACED"} current={order.status === "PLACED"} label={t("guest.stepConfirmed")} time={order.acceptedAt ? clock(order.acceptedAt) : undefined} />
                  <Step
                    done={order.status === "READY" || order.status === "COMPLETED"}
                    current={order.status === "PENDING"}
                    label={t("guest.stepCooking")}
                    time={order.status === "PENDING" ? t("guest.kitchensReady", { n: ready, total: order.items.length }) : undefined}
                  />
                  <Step done={order.status === "READY" || order.status === "COMPLETED"} label={t("guest.stepReady")} last />
                </ol>
              ) : null}

              <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-3.5">
                {Object.entries(groups).map(([category, items]) => {
                  const groupReady = items.every((item) => item.status === "READY");
                  const showPill = order.status === "PENDING" || order.status === "READY";
                  return (
                    <div key={category} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-extrabold">{category}</h2>
                        {showPill ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${groupReady ? "bg-success-light text-green-800" : "bg-brand-light text-brand-dark"}`}>
                            {groupReady ? t("guest.partReady") : t("guest.partCooking")}
                          </span>
                        ) : null}
                      </div>
                      {items.map((item, i) => (
                        <div key={`${item.menuItemId}-${i}`} className="flex justify-between text-sm">
                          <span>{localName(lang, item.nameSnapshot, item.nameGuSnapshot)}</span>
                          <span className="text-text-muted">× {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {order.note ? (
                  <div className="rounded-[10px] bg-orange-50 px-3 py-2 text-[13px] text-orange-900">
                    <strong>{t("guest.yourNote")}</strong> {order.note}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}

        {!sessionEnded ? (
          <button type="button" onClick={onOrderMore} className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-brand text-base font-extrabold text-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("guest.orderMore")}
          </button>
        ) : (
          <button type="button" onClick={onOrderMore} className="flex h-[54px] items-center justify-center rounded-[14px] border-[1.5px] border-brand text-base font-extrabold text-brand">
            {t("guest.backToMenu")}
          </button>
        )}

        {billable.length > 0 ? (
          <div className="flex flex-col gap-1.5 rounded-[14px] bg-stone-200/60 px-4 py-3.5 text-[13px] leading-relaxed text-stone-700">
            <span className="flex justify-between text-[15px] text-foreground">
              <strong>{t("guest.totalSoFar")}</strong>
              <strong>₹{total}</strong>
            </span>
            <span>{t("guest.payAndEmail", { email: state.verifiedEmail ?? state.orders[0]?.guestEmail ?? "" })}</span>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Step({ done, current, label, time, last }: { done?: boolean; current?: boolean; label: string; time?: string; last?: boolean }) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        {done ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-700 text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
        ) : current ? (
          <span className="h-6 w-6 rounded-full border-[6px] border-brand bg-surface" />
        ) : (
          <span className="h-6 w-6 rounded-full border-2 border-stone-400 bg-surface" />
        )}
        {!last ? <span className={`min-h-[18px] w-0.5 flex-grow ${done ? "bg-green-700" : "bg-border"}`} /> : null}
      </div>
      <div className={`flex flex-col ${last ? "" : "pb-3.5"}`}>
        <span className={`text-[15px] font-bold ${done || current ? "" : "text-text-muted"}`}>{label}</span>
        {time ? <span className="text-[13px] text-text-muted">{time}</span> : null}
      </div>
    </li>
  );
}
