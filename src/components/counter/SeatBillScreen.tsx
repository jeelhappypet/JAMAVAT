"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { FreeSeatCard, SettledCard } from "@/components/counter/SeatBillOutcome";
import { SeatOrderList } from "@/components/counter/SeatOrderList";
import { SettlePanel } from "@/components/counter/SettlePanel";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { POLL_MS, SAFETY_RESYNC_MS } from "@/lib/realtime/polling";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatClock } from "@/lib/utils/time";
import { localName } from "@/lib/i18n/messages";
import type { BillDTO, PaymentMode, SeatDetailDTO } from "@/types";
import { useAppPath } from "@/components/shell/RestaurantProvider";

/**
 * "Counter · settle seat bill": one guest's orders, then discount → paid by
 * → settle & free.
 *
 * This file is now the data and the decisions only; the orders list, the
 * settle panel and the two outcome cards are their own components. It was
 * 361 lines doing all four.
 *
 * The settle call itself is deliberately unchanged — it is one conditional
 * `findOneAndUpdate` on the server, so two people settling the same table at
 * the same moment still produce one bill and the loser gets a 409.
 */
export function SeatBillScreen({ seatId }: { seatId: string }) {
  const path = useAppPath();
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

  usePeriodicRefresh(load, state === "connected" ? SAFETY_RESYNC_MS : POLL_MS);

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
  const stillCooking = billable.filter((order) => order.status === "PENDING").length;

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
      setTimeout(() => router.push(path("/counter")), 3500);
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
    if (res.ok) router.push(path("/counter"));
    else setError((await res.json().catch(() => null))?.error ?? t("err.saveFailed"));
  }

  const seat = detail?.seat;
  const session = detail?.session;
  const minutes = session ? Math.max(0, Math.floor((now - new Date(session.openedAt).getTime()) / 60000)) : 0;
  const subtitle = seat
    ? [
        seat.area,
        session ? t("seatBill.seatedAt", { time: formatClock(session.openedAt, lang) }) : null,
        session ? t("counter.minutes", { n: minutes }) : null,
        session ? (billable.length === 1 ? t("seatBill.orderCountOne") : t("seatBill.orderCount", { n: billable.length })) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-muted">
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-3.5 gap-y-2 px-[clamp(16px,3vw,32px)] py-2.5">
          <IconButton href={path("/counter")} label={t("seatBill.back")} size="md">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5" />
              <path d="m11 6-6 6 6 6" />
            </svg>
          </IconButton>
          <div className="flex min-w-0 flex-grow flex-col">
            <span className="text-xl font-extrabold">{seat ? t("tables.table", { name: seat.code }) : "…"}</span>
            {subtitle ? <span className="truncate text-[13px] text-text-muted">{subtitle}</span> : null}
          </div>
          {session && !settled ? (
            <Button
              variant="secondary"
              size="sm"
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

      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-wrap items-start gap-5 px-[clamp(16px,3vw,32px)] pb-8 pt-4">
        {loading ? (
          <div className="w-full">
            <SkeletonCards count={2} minWidth={300} />
          </div>
        ) : settled ? (
          <SettledCard bill={settled} />
        ) : !session ? (
          <FreeSeatCard code={seat?.code ?? ""} message={error ?? undefined} />
        ) : (
          <>
            <SeatOrderList seatId={seatId} orders={orders} kitchenOf={kitchenOf} />
            <SettlePanel
              itemsTotal={itemsTotal}
              gst={detail.gst}
              discountText={discountText}
              onDiscountChange={setDiscountText}
              mode={mode}
              onModeChange={setMode}
              email={session.email}
              sendEmail={sendEmail}
              onSendEmailChange={setSendEmail}
              stillCooking={stillCooking}
              error={error}
              settling={settling}
              onSettle={settle}
            />
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
