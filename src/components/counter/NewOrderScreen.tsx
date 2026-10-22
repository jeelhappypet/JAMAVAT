"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/SearchField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SkeletonDishes } from "@/components/ui/Skeleton";
import { SuccessDialog } from "@/components/ui/SuccessDialog";
import { CategoryRail, type RailSection } from "@/components/orders/CategoryRail";
import { DishTile } from "@/components/orders/DishTile";
import { OrderCart, type CartLine } from "@/components/orders/OrderCart";
import { PosLayout } from "@/components/orders/PosLayout";
import { SwipeToSend } from "@/components/orders/SwipeToSend";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName, type MessageKey } from "@/lib/i18n/messages";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { PAYMENT_MODES, type MenuDTO, type MenuItemDTO, type PaymentMode, type SeatDetailDTO } from "@/types";
import { useAppPath } from "@/components/shell/RestaurantProvider";

const POLL_MS = 30000;
const PAY_LABEL: Record<PaymentMode, MessageKey> = { CASH: "seatBill.cash", UPI: "seatBill.upi", CARD: "seatBill.card" };
type Diet = "all" | "veg" | "nonveg";

interface SuccessInfo {
  customerName?: string;
  tokenNumber: number;
  totalAmount: number;
  paymentMode?: PaymentMode;
}

/** One category's dishes, with the heading the rail jumps to. */
interface Section {
  id: string;
  label: string;
  menuName: string;
  items: MenuItemDTO[];
}

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * The till. Tap dishes, swipe to send. A parcel gets a token number; with a
 * seat, the dishes join that table's bill — or, on a free table, open a new
 * one from the counter (no email/OTP; the QR shows "in use" until it's
 * settled).
 *
 * Three panes that scroll on their own inside one screen that does not
 * (`PosLayout`). It used to be a single long document with the bill floating
 * at the top, so taking an order from the fourth category scrolled the bill
 * out of sight — and the only way to check it was to scroll back.
 */
export function NewOrderScreen({ seatId }: { seatId?: string }) {
  const path = useAppPath();
  const router = useRouter();
  const { lang, t } = useI18n();

  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [lastTouched, setLastTouched] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState<Diet>("all");
  const [nextTokenNumber, setNextTokenNumber] = useState<number | undefined>();
  const [seat, setSeat] = useState<SeatDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const clientRequestIdRef = useRef<string>(crypto.randomUUID());
  const gridRef = useRef<HTMLDivElement>(null);
  /** Parcels are paid when ordered; most are cash, so every new parcel starts there. */
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");

  // ------------------------------------------------------------------ data
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
    // A seat order never needs a token, and a parcel never needs a seat:
    // only one of these two ever runs.
    if (seatId) void loadSeat();
    else void loadNextToken();
  }, [loadMenu, loadNextToken, loadSeat, seatId]);

  const { state } = useRealtime({ [REALTIME_EVENTS.MENU_UPDATED]: loadMenu });
  usePeriodicRefresh(loadMenu, POLL_MS, state !== "connected");

  // --------------------------------------------------------------- grouping
  const menuItemById = useMemo(
    () => new Map(menus.flatMap((menu) => menu.categories.flatMap((category) => category.items)).map((item) => [item.id, item])),
    [menus]
  );

  const multiMenu = menus.length > 1;

  /** Every category with at least one dish left after the search and the diet filter. */
  const sections = useMemo<Section[]>(() => {
    const needle = query.trim().toLowerCase();
    const out: Section[] = [];
    for (const menu of menus) {
      for (const category of menu.categories) {
        const items = category.items.filter((item) => {
          if (diet === "veg" && !item.isVeg) return false;
          if (diet === "nonveg" && item.isVeg) return false;
          if (!needle) return true;
          // Both spellings: staff type "thali" as often as "થાળી".
          return `${item.name} ${item.nameGu ?? ""}`.toLowerCase().includes(needle);
        });
        if (items.length > 0) {
          out.push({
            id: category.id,
            label: localName(lang, category.name, category.nameGu),
            menuName: localName(lang, menu.name, menu.nameGu),
            items,
          });
        }
      }
    }
    return out;
  }, [menus, query, diet, lang]);

  const matchCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  const railSections = useMemo<RailSection[]>(
    () => sections.map((section) => ({ id: section.id, label: section.label, group: multiMenu ? section.menuName : undefined, count: section.items.length })),
    [sections, multiMenu]
  );

  // ------------------------------------------------------------------ cart
  const change = (menuItemId: string, delta: number) => {
    setLastTouched(menuItemId);
    setCart((prev) => {
      const next = { ...prev };
      const qty = (next[menuItemId] ?? 0) + delta;
      if (qty <= 0) delete next[menuItemId];
      else next[menuItemId] = qty;
      return next;
    });
  };

  const lines = useMemo<CartLine[]>(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([menuItemId, quantity]) => {
          const item = menuItemById.get(menuItemId);
          const unitPrice = item?.price ?? 0;
          return {
            key: menuItemId,
            name: item ? localName(lang, item.name, item.nameGu) : "",
            isVeg: item?.isVeg ?? true,
            quantity,
            unitPrice,
            lineTotal: unitPrice * quantity,
            justChanged: menuItemId === lastTouched,
          };
        }),
    [cart, menuItemById, lang, lastTouched]
  );

  const totalAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const pieces = lines.reduce((sum, line) => sum + line.quantity, 0);

  // ------------------------------------------------------------------ send
  async function handleSend() {
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({ menuItemId: line.key, quantity: line.quantity })),
          clientRequestId: clientRequestIdRef.current,
          ...(seatId ? { seatId } : { paymentMode }),
        }),
      });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? t("err.orderFailed"));

      setCart({});
      setLastTouched(null);
      setPaymentMode("CASH");
      clientRequestIdRef.current = crypto.randomUUID();
      if (seatId) {
        router.push(path(`/counter/seat/${seatId}`));
        return;
      }
      setSuccess({ customerName: data.customerName, tokenNumber: data.tokenNumber, totalAmount: data.totalAmount, paymentMode });
      void loadNextToken();
      setTimeout(() => router.push(path("/counter/orders")), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.orderFailed"));
      throw err;
    }
  }

  const seatCode = seat?.seat.code;
  /** A free table: this order opens it. */
  const newTable = Boolean(seatId && seat && !seat.session);
  const dishesLabel = pieces === 1 ? t("parcel.piecesOne") : t("parcel.pieces", { n: pieces });

  const cartPanel = (
    <OrderCart
      title={seatId ? t("tables.table", { name: seatCode ?? "…" }) : t("parcel.token", { n: nextTokenNumber ?? "–" })}
      subtitle={newTable ? t("parcel.newTableNote", { code: seatCode ?? "" }) : undefined}
      lines={lines}
      total={totalAmount}
      count={lines.length}
      countLabel={dishesLabel}
      emptyText={t("pos.cartEmpty")}
      onChange={(key, delta) => change(key, delta)}
      decreaseLabel={t("guest.removeOne")}
      increaseLabel={t("guest.addOne")}
      totalLabel={t("counter.total")}
      action={
        <SwipeToSend
          label={seatId ? t(newTable ? "parcel.swipeNewSeat" : "parcel.swipeSeat", { code: seatCode ?? "" }) : undefined}
          disabled={lines.length === 0 || Boolean(seatId && !seat)}
          onComplete={handleSend}
        />
      }
    >
      {seatId ? null : (
        <SegmentedControl
          label={t("seatBill.paidBy")}
          value={paymentMode}
          onChange={setPaymentMode}
          className="[&>button]:flex-1"
          options={PAYMENT_MODES.map((mode) => ({ value: mode, label: t(PAY_LABEL[mode]) }))}
        />
      )}
    </OrderCart>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {seatId ? (
          <Link
            href={path(newTable ? "/counter" : `/counter/seat/${seatId}`)}
            aria-label={t("seatBill.back")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface transition-colors hover:border-brand hover:text-brand"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5" />
              <path d="m11 6-6 6 6 6" />
            </svg>
          </Link>
        ) : null}
        <h1 className="text-[22px] font-extrabold tracking-tight">
          {seatId ? (newTable ? t("parcel.newTableTitle", { code: seatCode ?? "…" }) : t("parcel.addTitle", { code: seatCode ?? "…" })) : t("parcel.title")}
        </h1>
      </div>

      {newTable ? <Alert tone="info">{t("parcel.newTableNote", { code: seatCode ?? "" })}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}

      {loading ? (
        <SkeletonDishes />
      ) : menuItemById.size === 0 ? (
        <EmptyState title={t("guest.menuEmpty")} />
      ) : (
        <PosLayout
          scrollRef={gridRef}
          rail={<CategoryRail sections={railSections} scrollRef={gridRef} label={t("pos.categories")} />}
          cart={cartPanel}
          cartEmpty={lines.length === 0}
          openCartLabel={t("pos.openBill")}
          closeCartLabel={t("pos.closeBill")}
          cartSummary={
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] text-white/70">
                {seatId ? t("tables.table", { name: seatCode ?? "…" }) : t("parcel.token", { n: nextTokenNumber ?? "–" })} · {dishesLabel}
              </span>
              <span className="text-lg font-extrabold tabular-nums">{rupees(totalAmount)}</span>
            </span>
          }
          toolbar={
            <div className="flex flex-wrap items-center gap-2.5">
              <SearchField
                value={query}
                onChange={setQuery}
                label={t("guest.search")}
                clearLabel={t("pos.searchClear")}
                resultCount={query ? matchCount : undefined}
                resultLabel={matchCount === 1 ? t("pos.searchResultsOne") : t("pos.searchResults", { n: matchCount })}
                className="min-w-[180px] flex-[999_1_240px]"
              />
              <SegmentedControl
                label={t("pos.filterDiet")}
                value={diet}
                onChange={setDiet}
                options={[
                  { value: "all", label: t("pos.all") },
                  { value: "veg", label: t("pos.veg") },
                  { value: "nonveg", label: t("pos.nonVeg") },
                ]}
              />
            </div>
          }
        >
          <>
            {sections.length === 0 ? (
              <EmptyState title={t("pos.noMatch", { q: query })} />
            ) : (
              <div className="flex flex-col gap-5">
                {sections.map((section) => (
                  <section key={section.id} id={`pos-section-${section.id}`} className="flex scroll-mt-2 flex-col gap-2">
                    <h2 className="flex items-baseline gap-2 text-[15px] font-extrabold">
                      {section.label}
                      {multiMenu ? <span className="text-[12px] font-semibold text-text-muted">{section.menuName}</span> : null}
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-2.5">
                      {section.items.map((item) => (
                        <DishTile
                          key={item.id}
                          name={localName(lang, item.name, item.nameGu)}
                          subName={item.nameGu && lang === "en" ? item.nameGu : undefined}
                          price={item.price}
                          isVeg={item.isVeg}
                          soldOut={!item.isAvailable}
                          quantity={cart[item.id] ?? 0}
                          onAdd={() => change(item.id, 1)}
                          onChange={(delta) => change(item.id, delta)}
                          addLabel={t("pos.addDish", { name: localName(lang, item.name, item.nameGu) })}
                          decreaseLabel={t("guest.removeOne")}
                          increaseLabel={t("guest.addOne")}
                          soldOutLabel={t("menu.soldOut")}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        </PosLayout>
      )}

      <SuccessDialog open={success !== null}>
        {success ? (
          <div className="flex flex-col items-center gap-2">
            {success.customerName ? <p className="text-lg text-text-muted">{success.customerName}</p> : null}
            <p className="text-sm font-bold uppercase tracking-wide text-text-muted">{t("parcel.tokenLabel")}</p>
            <p className="text-7xl font-extrabold text-brand">{success.tokenNumber}</p>
            <p className="text-2xl font-semibold">
              {rupees(success.totalAmount)}
              {success.paymentMode ? <span className="text-text-muted"> · {t(PAY_LABEL[success.paymentMode])}</span> : null}
            </p>
          </div>
        ) : null}
      </SuccessDialog>
    </div>
  );
}
