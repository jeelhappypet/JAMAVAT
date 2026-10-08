"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { IconButton } from "@/components/ui/IconButton";
import { TextField } from "@/components/ui/TextField";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { POLL_MS, SAFETY_RESYNC_MS } from "@/lib/realtime/polling";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatClock } from "@/lib/utils/time";
import { localName, type MessageKey } from "@/lib/i18n/messages";
import { PAYMENT_MODES, type BillDTO, type OrderDTO, type PaymentMode, type SeatDetailDTO } from "@/types";

const STATUS: Record<OrderDTO["status"], { label: MessageKey; tone: "orange" | "green" | "red" }> = {
  PENDING: { label: "seatBill.statusCooking", tone: "orange" },
  READY: { label: "seatBill.statusReady", tone: "green" },
  COMPLETED: { label: "seatBill.statusReady", tone: "green" },
  CANCELLED: { label: "seatBill.statusCancelled", tone: "red" },
};

const PAY_LABEL: Record<PaymentMode, MessageKey> = { CASH: "seatBill.cash", UPI: "seatBill.upi", CARD: "seatBill.card" };

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/** "Counter · settle seat bill" artboard: one guest's orders, then discount → paid by → settle & free. */
export function SeatBillScreen({ seatId }: { seatId: string }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [detail, setDetail] = useState<SeatDetailDTO | null>(null);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  // Only this table's events matter: anything that changes it sends SEAT_UPDATED for this seat,
  // and kitchen progress arrives as events for one of its orders.
  const orderIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    orderIds.current = new Set(detail?.orders.map((order) => order.id) ?? []);
  }, [detail]);
  const ifMine = (payload: unknown) => {
    const { id, seatId: forSeat } = (payload ?? {}) as { id?: string; seatId?: string };
    if (forSeat === seatId || (id && orderIds.current.has(id))) void load();
  };
  const { state } = useRealtime(
    {
      [REALTIME_EVENTS.ORDER_ITEMS_READY]: ifMine,
      [REALTIME_EVENTS.ORDER_READY]: ifMine,
      [REALTIME_EVENTS.ORDER_CANCELLED]: ifMine,
      [REALTIME_EVENTS.SEAT_UPDATED]: ifMine,
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

  const kitchenOf = (categoryId?: string) => {
    const kitchen = categoryId ? detail?.kitchens[categoryId] : undefined;
    return kitchen ? localName(lang, kitchen.name, kitchen.nameGu) : undefined;
  };

  const orders = detail?.orders ?? [];
  const billable = orders.filter((order) => order.status !== "CANCELLED");
  const itemsTotal = billable.reduce((sum, order) => sum + order.totalAmount, 0);
  const discount = Math.max(0, Math.floor(Number(discountText) || 0));
  const toCollect = Math.max(0, itemsTotal - discount);
  const stillCooking = billable.filter((order) => order.status === "PENDING").length;
  const clock = (iso: string) => formatClock(iso, lang);

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
          <IconButton href="/counter" label={t("seatBill.back")} size="md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5" />
              <path d="m11 6-6 6 6 6" />
            </svg>
          </IconButton>
          <div className="flex min-w-0 flex-grow flex-col">
            <span className="text-[22px] font-extrabold">{seat ? t("tables.table", { name: seat.code }) : "…"}</span>
            {subtitle ? <span className="text-[13px] text-text-muted">{subtitle}</span> : null}
          </div>
          {session && !settled ? (
            <Button
              variant="secondary"
              onClick={() => setConfirmFree(true)}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 7.5-2" />
                </svg>
              }
            >
              {t("seatBill.freeQr", { code: seat?.code ?? "" })}
            </Button>
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
            <Button href="/counter" size="lg" className="mt-2">
              {t("seatBill.backToSeats")}
            </Button>
          </section>
        ) : !session ? (
          <section className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-3 rounded-[20px] border border-border bg-surface p-8 text-center">
            <h1 className="text-xl font-extrabold">{t("seatBill.freeTitle", { code: seat?.code ?? "" })}</h1>
            <p className="text-[15px] text-text-muted">{error ?? t("seatBill.freeBody")}</p>
            <Button href="/counter" variant="secondary" size="lg" className="mt-2">
              {t("seatBill.backToSeats")}
            </Button>
          </section>
        ) : (
          <>
            <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h2 className="text-lg font-extrabold">{t("seatBill.ordersTitle")}</h2>
                <Button
                  href={`/new-order?seat=${seatId}`}
                  variant="secondary"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  }
                >
                  {t("seatBill.addItem")}
                </Button>
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
                    <Badge tone={STATUS[order.status].tone}>{t(STATUS[order.status].label)}</Badge>
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
                            <td className="px-2 py-2.5 text-text-muted">{kitchenOf(item.categoryId) ?? item.categorySnapshot}</td>
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
                  <TextField
                    size="sm"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={itemsTotal}
                    value={discountText}
                    onChange={(e) => setDiscountText(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
                    onFocus={(e) => e.target.select()}
                    className="w-[110px]"
                    inputClassName="text-right"
                  />
                </label>
                <div className="mt-1 flex items-baseline justify-between border-t border-dashed border-stone-300 pt-3">
                  <span className="text-base font-bold">{t("seatBill.toCollect")}</span>
                  <span className="text-[30px] font-extrabold tracking-tight">{rupees(toCollect)}</span>
                </div>
              </div>

              <ChoiceCards name="pay" legend={t("seatBill.paidBy")} value={mode} onChange={setMode} options={PAYMENT_MODES.map((option) => ({ value: option, label: t(PAY_LABEL[option]) }))} />

              <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-stone-50 p-3.5">
                <span className="text-sm font-bold">{t("seatBill.emailTitle")}</span>
                {session.email ? (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Checkbox checked={sendEmail} onChange={setSendEmail} label={<span className="block truncate">{session.email}</span>} className="min-w-0 flex-grow items-center" />
                    <Badge tone="green" size="sm">
                      {t("counter.verified")}
                    </Badge>
                  </div>
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

              {error ? <Alert>{error}</Alert> : null}

              <Button size="xl" fullWidth onClick={settle} disabled={settling || discount > itemsTotal}>
                {settling ? t("seatBill.settling") : t("seatBill.settleAction")}
              </Button>
            </aside>
          </>
        )}
      </main>

      <ConfirmDialog
        open={confirmFree}
        title={t("seatBill.freeConfirmTitle", { code: seat?.code ?? "" })}
        description={t("seatBill.freeConfirmDesc")}
        confirmLabel={t("counter.freeQr")}
        onConfirm={freeQr}
        onCancel={() => setConfirmFree(false)}
      />
    </div>
  );
}
