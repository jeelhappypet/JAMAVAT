"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategorySection } from "@/components/menu/CategorySection";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { OrderSummary, type OrderLine } from "@/components/orders/OrderSummary";
import { SwipeToSend } from "@/components/orders/SwipeToSend";
import { SuccessDialog } from "@/components/ui/SuccessDialog";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Alert } from "@/components/ui/Alert";
import { localName } from "@/lib/i18n/messages";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import type { MenuDTO, MenuItemDTO, SeatDetailDTO } from "@/types";

const POLL_MS = 30000;

interface SuccessInfo {
  customerName?: string;
  tokenNumber: number;
  totalAmount: number;
}

/** Tap dishes, swipe to send. A parcel gets a token number; with a seat, the dishes join that guest's bill. */
export function NewOrderScreen({ seatId }: { seatId?: string }) {
  const router = useRouter();
  const { lang, t } = useI18n();
  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [nextTokenNumber, setNextTokenNumber] = useState<number | undefined>();
  const [seat, setSeat] = useState<SeatDetailDTO | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const clientRequestIdRef = useRef<string>(crypto.randomUUID());

  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menu?activeOnly=1");
      if (redirectToLoginIfUnauthorized(res)) return;
      if (!res.ok) throw new Error();
      setMenus((await res.json()).menus);
    } catch {
      setError(t("err.menuLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadNextToken = useCallback(async () => {
    const res = await fetch("/api/orders/next-token");
    if (redirectToLoginIfUnauthorized(res)) return;
    setNextTokenNumber(res.ok ? (await res.json()).tokenNumber : undefined);
  }, []);

  const loadSeat = useCallback(async () => {
    if (!seatId) return;
    const res = await fetch(`/api/seats/${seatId}`);
    if (redirectToLoginIfUnauthorized(res)) return;
    if (res.ok) setSeat(await res.json());
  }, [seatId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    loadMenu();
    if (seatId) void loadSeat();
    else void loadNextToken();
  }, [loadMenu, loadNextToken, loadSeat, seatId]);

  const { state } = useRealtime({ [REALTIME_EVENTS.MENU_UPDATED]: loadMenu });
  usePeriodicRefresh(loadMenu, POLL_MS, state !== "connected");

  const menuItems = useMemo<MenuItemDTO[]>(() => menus.flatMap((menu) => menu.categories.flatMap((category) => category.items)), [menus]);
  const menuItemById = useMemo(() => new Map(menuItems.map((item) => [item.id, item])), [menuItems]);

  const lines: OrderLine[] = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([menuItemId, quantity]) => {
          const item = menuItemById.get(menuItemId);
          return { menuItemId, name: item ? localName(lang, item.name, item.nameGu) : "", unitPrice: item?.price ?? 0, quantity };
        }),
    [cart, menuItemById, lang]
  );
  const totalAmount = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const change = (menuItemId: string, delta: number) =>
    setCart((prev) => {
      const next = { ...prev };
      const qty = (next[menuItemId] ?? 0) + delta;
      if (qty <= 0) delete next[menuItemId];
      else next[menuItemId] = qty;
      return next;
    });

  async function handleSend() {
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity })),
          clientRequestId: clientRequestIdRef.current,
          ...(seatId ? { seatId } : {}),
        }),
      });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? t("err.orderFailed"));

      setCart({});
      setSummaryExpanded(false);
      clientRequestIdRef.current = crypto.randomUUID();
      if (seatId) {
        router.push(`/counter/seat/${seatId}`);
        return;
      }
      setSuccess({ customerName: data.customerName, tokenNumber: data.tokenNumber, totalAmount: data.totalAmount });
      void loadNextToken();
      setTimeout(() => router.push("/counter/orders"), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.orderFailed"));
      throw err;
    }
  }

  const seatCode = seat?.seat.code;
  const seatClosed = seatId && seat && !seat.session;

  return (
    <div className="flex flex-col gap-5 pb-[55vh] lg:flex-row lg:items-start lg:gap-8 lg:pb-0">
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          {seatId ? (
            <Link href={`/counter/seat/${seatId}`} aria-label={t("seatBill.back")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M19 12H5" />
                <path d="m11 6-6 6 6 6" />
              </svg>
            </Link>
          ) : null}
          <h1 className="text-[26px] font-extrabold tracking-tight">{seatId ? t("parcel.addTitle", { code: seatCode ?? "…" }) : t("parcel.title")}</h1>
        </div>

        {seatClosed ? <Alert>{t("err.seatNotInUse")}</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}

        {loading ? (
          <LoadingState />
        ) : menuItems.length === 0 ? (
          <EmptyState title={t("guest.menuEmpty")} />
        ) : (
          <div className="flex flex-col gap-6">
            {menus.map((menu) => (
              <div key={menu.id} className="flex flex-col gap-6">
                {menus.length > 1 ? <h2 className="text-xl font-extrabold">{localName(lang, menu.name, menu.nameGu)}</h2> : null}
                {menu.categories.map((category) =>
                  category.items.length === 0 ? null : (
                    <CategorySection key={category.id} title={localName(lang, category.name, category.nameGu)}>
                      {category.items.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          name={localName(lang, item.name, item.nameGu)}
                          price={item.price}
                          quantity={cart[item.id] ?? 0}
                          soldOutLabel={item.isAvailable ? undefined : t("menu.soldOut")}
                          onClick={item.isAvailable ? () => change(item.id, 1) : undefined}
                        />
                      ))}
                    </CategorySection>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <OrderSummary
        heading={seatId ? t("tables.table", { name: seatCode ?? "…" }) : t("parcel.token", { n: nextTokenNumber ?? "–" })}
        lines={lines}
        totalAmount={totalAmount}
        onIncrement={(id) => change(id, 1)}
        onDecrement={(id) => change(id, -1)}
        expanded={summaryExpanded}
        onExpandedChange={setSummaryExpanded}
        footer={
          <SwipeToSend
            label={seatId ? t("parcel.swipeSeat", { code: seatCode ?? "" }) : undefined}
            disabled={lines.length === 0 || Boolean(seatClosed)}
            onComplete={handleSend}
          />
        }
      />

      <SuccessDialog open={success !== null}>
        {success ? (
          <div className="flex flex-col items-center gap-2">
            {success.customerName ? <p className="text-lg text-text-muted">{success.customerName}</p> : null}
            <p className="text-sm font-bold uppercase tracking-wide text-text-muted">{t("parcel.tokenLabel")}</p>
            <p className="text-7xl font-extrabold text-brand">{success.tokenNumber}</p>
            <p className="text-2xl font-semibold">₹{success.totalAmount}</p>
          </div>
        ) : null}
      </SuccessDialog>
    </div>
  );
}
