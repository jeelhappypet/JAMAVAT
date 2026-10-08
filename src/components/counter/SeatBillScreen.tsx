"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { POLL_MS, SAFETY_RESYNC_MS } from "@/lib/realtime/polling";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName, type MessageKey } from "@/lib/i18n/messages";
import { PAYMENT_MODES, type BillDTO, type MenuDTO, type OrderDTO, type PaymentMode, type SeatDetailDTO } from "@/types";

const STATUS: Record<OrderDTO["status"], { label: MessageKey; className: string }> = {
  PENDING: { label: "seatBill.statusCooking", className: "bg-orange-100 text-brand-dark" },
  READY: { label: "seatBill.statusReady", className: "bg-success-light text-green-800" },
  COMPLETED: { label: "seatBill.statusServed", className: "bg-success-light text-green-800" },
  CANCELLED: { label: "seatBill.statusCancelled", className: "bg-danger-light text-red-800" },
};

const PAY_LABEL: Record<PaymentMode, MessageKey> = { CASH: "seatBill.cash", UPI: "seatBill.upi", CARD: "seatBill.card" };

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/** "Counter · settle seat bill" artboard: one guest's orders, then discount → paid by → settle & free. */
export function SeatBillScreen({ seatId }: { seatId: string }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [detail, setDetail] = useState<SeatDetailDTO | null>(null);
  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discountText, setDiscountText] = useState("0");
  const [mode, setMode] = useState<PaymentMode>("UPI");
  const [sendEmail, setSendEmail] = useState(true);
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState<BillDTO | null>(null);
  const [confirmFree, setConfirmFree] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const settledRef = useRef(false);

  const load = useCallback(async () => {
    if (settledRef.current) return;
    try {
      const res = await fetch(`/api/seats/${seatId}`, { cache: "no-store" });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("err.ordersLoad"));
    } finally {
      setLoading(false);
    }
  }, [seatId, t]);

  const loadMenus = useCallback(async () => {
    const res = await fetch("/api/menu");
    if (redirectToLoginIfUnauthorized(res)) return;
    const data = await res.json().catch(() => null);
    if (res.ok) setMenus(data.menus);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    void loadMenus();
  }, [load, loadMenus]);

  const { state } = useRealtime(
    {
      [REALTIME_EVENTS.ORDER_CREATED]: load,
      [REALTIME_EVENTS.ORDER_ITEMS_READY]: load,
      [REALTIME_EVENTS.ORDER_READY]: load,
      [REALTIME_EVENTS.ORDER_COMPLETED]: load,
      [REALTIME_EVENTS.ORDER_CANCELLED]: load,
      [REALTIME_EVENTS.SEAT_UPDATED]: load,
    },
    load
  );

  useEffect(() => {
    const interval = setInterval(load, state === "connected" ? SAFETY_RESYNC_MS : POLL_MS);
    return () => clearInterval(interval);
  }, [state, load]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const kitchenByCategory = useMemo(() => {
    const map = new Map<string, string>();
    menus.forEach((menu) => menu.categories.forEach((category) => map.set(category.id, localName(lang, menu.name, menu.nameGu))));
    return map;
  }, [menus, lang]);

  const orders = detail?.orders ?? [];
  const billable = orders.filter((order) => order.status !== "CANCELLED");
  const itemsTotal = billable.reduce((sum, order) => sum + order.totalAmount, 0);
  const discount = Math.max(0, Math.floor(Number(discountText) || 0));
  const toCollect = Math.max(0, itemsTotal - discount);
  const stillCooking = billable.filter((order) => order.status === "PENDING").length;
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(lang === "gu" ? "gu-IN" : "en-IN", { hour: "numeric", minute: "2-digit" });

  async function settle() {
    if (!detail?.session) return;
    if (discount > itemsTotal) return setError(t("err.discountTooHigh"));
    setSettling(true);
    setError(null);
    try {
      const res = await fetch(`/api/seats/${seatId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: detail.session.id, discount, paymentMode: mode, sendEmail: sendEmail && !!detail.session.email }),
      });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("err.settleFailed"));
      settledRef.current = true;
      setSettled(data);
      setTimeout(() => router.push("/counter"), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.settleFailed"));
      void load();
    } finally {
      setSettling(false);
    }
  }

  async function freeQr() {
    setConfirmFree(false);
    const res = await fetch(`/api/seats/${seatId}/free`, { method: "POST" });
    if (redirectToLoginIfUnauthorized(res)) return;
    if (res.ok) router.push("/counter");
    else setError((await res.json().catch(() => null))?.error ?? t("err.saveFailed"));
  }

  const seat = detail?.seat;
  const session = detail?.session;
  const minutes = session ? Math.max(0, Math.floor((now - new Date(session.openedAt).getTime()) / 60000)) : 0;
  const subtitle = seat
    ? [
        seat.area,
        session ? t("seatBill.seatedAt", { time: clock(session.openedAt) }) : null,
        session ? t("counter.minutes", { n: minutes }) : null,
        session ? (billable.length === 1 ? t("seatBill.orderCountOne") : t("seatBill.orderCount", { n: billable.length })) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-muted">
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-4 gap-y-3 px-[clamp(16px,3vw,32px)] py-3">
          <Link href="/counter" aria-label={t("seatBill.back")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5" />
              <path d="m11 6-6 6 6 6" />
            </svg>
          </Link>
          <div className="flex min-w-0 flex-grow flex-col">
            <span className="text-[22px] font-extrabold">{seat ? t("tables.table", { name: seat.code }) : "…"}</span>
            {subtitle ? <span className="text-[13px] text-text-muted">{subtitle}</span> : null}
          </div>
          {session && !settled ? (
            <button
              type="button"
              onClick={() => setConfirmFree(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-stone-300 bg-surface px-3.5 text-sm font-bold text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 7.5-2" />
              </svg>
              {t("seatBill.freeQr", { code: seat?.code ?? "" })}
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-wrap items-start gap-6 px-[clamp(16px,3vw,32px)] pb-10 pt-5">
        {loading ? (
          <div className="w-full">
            <LoadingState />
          </div>
        ) : settled ? (
          <section className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-3 rounded-[20px] border border-border bg-surface p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-light text-green-700">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <h1 className="text-2xl font-extrabold">{t("seatBill.settledTitle", { code: settled.seatCode })}</h1>
            <p className="text-[15px] text-text-muted">
              {t("seatBill.settledBody", { no: String(settled.billNo).padStart(4, "0"), total: rupees(settled.total), mode: t(PAY_LABEL[settled.paymentMode]) })}
            </p>
            <p className="text-sm font-semibold text-stone-700">
              {settled.emailStatus === "SENT"
                ? t("seatBill.emailSent", { email: settled.email ?? "" })
                : settled.emailStatus === "FAILED"
                  ? t("seatBill.emailFailed")
                  : t("seatBill.emailSkipped")}
            </p>
            <Link href="/counter" className="mt-2 flex h-12 items-center rounded-xl bg-brand px-5 text-base font-extrabold text-white">
              {t("seatBill.backToSeats")}
            </Link>
          </section>
        ) : !session ? (
          <section className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-3 rounded-[20px] border border-border bg-surface p-8 text-center">
            <h1 className="text-xl font-extrabold">{t("seatBill.freeTitle", { code: seat?.code ?? "" })}</h1>
            <p className="text-[15px] text-text-muted">{error ?? t("seatBill.freeBody")}</p>
            <Link href="/counter" className="mt-2 flex h-12 items-center rounded-xl border border-stone-300 bg-surface px-5 text-base font-bold">
              {t("seatBill.backToSeats")}
            </Link>
          </section>
        ) : (
          <>
            <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h2 className="text-lg font-extrabold">{t("seatBill.ordersTitle")}</h2>
                <Link
                  href={`/new-order?seat=${seatId}`}
                  className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-bold text-foreground"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  {t("seatBill.addItem")}
                </Link>
              </div>

              {orders.map((order, index) => (
                <article key={order.id} className={`overflow-hidden rounded-[18px] border border-border bg-surface ${order.status === "CANCELLED" ? "opacity-70" : ""}`}>
                  <div className="flex items-center justify-between gap-2.5 border-b border-border bg-stone-50 px-4 py-3">
                    <span className="text-sm font-extrabold">
                      {t("seatBill.orderNo", { n: order.tokenNumber })}{" "}
                      <span className="font-semibold text-text-muted">
                        · {clock(order.createdAt)} · {order.source === "QR" ? t("seatBill.sourceQr") : t("seatBill.sourceCounter")}
                      </span>
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[order.status].className}`}>{t(STATUS[order.status].label)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[460px] border-collapse text-[15px]">
                      {index === 0 ? (
                        <thead>
                          <tr className="text-left text-xs tracking-wide text-text-muted">
                            <th className="px-4 py-2.5 font-bold">{t("seatBill.colItem")}</th>
                            <th className="px-2 py-2.5 font-bold">{t("seatBill.colKitchen")}</th>
                            <th className="px-2 py-2.5 text-right font-bold">{t("seatBill.colQty")}</th>
                            <th className="px-4 py-2.5 text-right font-bold">{t("seatBill.colAmount")}</th>
                          </tr>
                        </thead>
                      ) : null}
                      <tbody>
                        {order.items.map((item, i) => (
                          <tr key={`${item.menuItemId}-${i}`} className={index === 0 || i > 0 ? "border-t border-stone-100" : ""}>
                            <td className="px-4 py-2.5 font-semibold">{localName(lang, item.nameSnapshot, item.nameGuSnapshot)}</td>
                            <td className="px-2 py-2.5 text-text-muted">{(item.categoryId && kitchenByCategory.get(item.categoryId)) || item.categorySnapshot}</td>
                            <td className="px-2 py-2.5 text-right">{item.quantity}</td>
                            <td className={`px-4 py-2.5 text-right font-bold ${order.status === "CANCELLED" ? "line-through" : ""}`}>{rupees(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {order.note ? (
                    <div className="border-t border-stone-100 px-4 py-2.5 text-[13px] text-orange-900">
                      <strong>{t("counter.note")}</strong> {order.note}
                    </div>
                  ) : null}
                </article>
              ))}
            </section>

            <aside className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 rounded-[20px] border border-border bg-surface p-5">
              <h2 className="text-lg font-extrabold">{t("seatBill.settleTitle")}</h2>

              <div className="flex flex-col gap-2 text-[15px]">
                <div className="flex justify-between text-stone-700">
                  <span>{t("seatBill.itemsTotal")}</span>
                  <span>{rupees(itemsTotal)}</span>
                </div>
                <label className="flex items-center justify-between gap-2.5 text-stone-700">
                  <span>{t("seatBill.discount")}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={itemsTotal}
                    value={discountText}
                    onChange={(e) => setDiscountText(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
                    onFocus={(e) => e.target.select()}
                    className="h-10 w-[110px] rounded-[10px] border border-stone-300 px-2.5 text-right text-[15px] text-foreground"
                  />
                </label>
                <div className="mt-1 flex items-baseline justify-between border-t border-dashed border-stone-300 pt-3">
                  <span className="text-base font-bold">{t("seatBill.toCollect")}</span>
                  <span className="text-[30px] font-extrabold tracking-tight">{rupees(toCollect)}</span>
                </div>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold">{t("seatBill.paidBy")}</legend>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_MODES.map((option) => {
                    const on = option === mode;
                    return (
                      <label
                        key={option}
                        className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] ${on ? "border-2 border-brand bg-orange-50 font-extrabold text-brand-dark" : "border border-border font-bold"}`}
                      >
                        <input type="radio" name="pay" checked={on} onChange={() => setMode(option)} className="m-0 accent-[#c2410c]" />
                        {t(PAY_LABEL[option])}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-stone-50 p-3.5">
                <span className="text-sm font-bold">{t("seatBill.emailTitle")}</span>
                {session.email ? (
                  <label className="flex items-center gap-2.5 text-sm">
                    <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="m-0 h-5 w-5 accent-[#c2410c]" />
                    <span className="min-w-0 flex-grow truncate">{session.email}</span>
                    <span className="rounded-full bg-success-light px-2 py-0.5 text-[11px] font-bold text-green-800">{t("counter.verified")}</span>
                  </label>
                ) : (
                  <span className="text-sm text-text-muted">{t("seatBill.noEmail")}</span>
                )}
                <span className="text-xs text-text-muted">{t("seatBill.emailHint")}</span>
              </div>

              {stillCooking > 0 ? (
                <div className="rounded-[14px] bg-orange-50 px-3.5 py-2.5 text-[13px] font-semibold text-orange-900">
                  {stillCooking === 1 ? t("seatBill.stillCookingOne") : t("seatBill.stillCooking", { n: stillCooking })}
                </div>
              ) : null}

              {error ? (
                <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                onClick={settle}
                disabled={settling || discount > itemsTotal}
                className="h-14 rounded-[14px] bg-brand text-[17px] font-extrabold text-white disabled:opacity-60"
              >
                {settling ? t("seatBill.settling") : t("seatBill.settleAction")}
              </button>
            </aside>
          </>
        )}
      </main>

      <ConfirmDialog
        open={confirmFree}
        title={t("seatBill.freeConfirmTitle", { code: seat?.code ?? "" })}
        description={t("seatBill.freeConfirmDesc")}
        confirmLabel={t("counter.freeQr")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={freeQr}
        onCancel={() => setConfirmFree(false)}
      />
    </div>
  );
}
