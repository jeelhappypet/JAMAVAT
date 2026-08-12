"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeButton } from "@/components/ui/HomeButton";
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
import { MENU_CATEGORIES } from "@/types";
import type { MenuItemDTO } from "@/types";

const POLL_MS = 30000;

interface SuccessInfo {
  customerName?: string;
  tokenNumber: number;
  totalAmount: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const clientRequestIdRef = useRef<string>(crypto.randomUUID());

  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menu?activeOnly=1");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMenuItems(data.items);
    } catch {
      setError("મેનુ લાવી શકાયું નથી");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    loadMenu();
  }, [loadMenu]);

  usePeriodicRefresh(loadMenu, POLL_MS);
  useRealtime({ [REALTIME_EVENTS.MENU_UPDATED]: loadMenu });

  const menuItemById = useMemo(() => new Map(menuItems.map((item) => [item.id, item])), [menuItems]);

  const lines: OrderLine[] = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([menuItemId, quantity]) => {
          const item = menuItemById.get(menuItemId);
          return {
            menuItemId,
            name: item?.name ?? "",
            unitPrice: item?.price ?? 0,
            quantity,
          };
        }),
    [cart, menuItemById]
  );

  const totalAmount = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  function addItem(menuItemId: string) {
    setCart((prev) => ({ ...prev, [menuItemId]: (prev[menuItemId] ?? 0) + 1 }));
  }

  function incrementItem(menuItemId: string) {
    setCart((prev) => ({ ...prev, [menuItemId]: (prev[menuItemId] ?? 0) + 1 }));
  }

  function decrementItem(menuItemId: string) {
    setCart((prev) => {
      const next = { ...prev };
      const qty = (next[menuItemId] ?? 0) - 1;
      if (qty <= 0) delete next[menuItemId];
      else next[menuItemId] = qty;
      return next;
    });
  }

  async function handleSend() {
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim() || undefined,
          items: lines.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity })),
          clientRequestId: clientRequestIdRef.current,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "ઓર્ડર મોકલી શકાયો નથી");

      setSuccess({
        customerName: data.customerName,
        tokenNumber: data.tokenNumber,
        totalAmount: data.totalAmount,
      });
      setCart({});
      clientRequestIdRef.current = crypto.randomUUID();

      setTimeout(() => router.push("/"), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ઓર્ડર મોકલી શકાયો નથી");
      throw err;
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 pb-[70vh] sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:pb-6">
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <HomeButton />
          <h1 className="text-xl font-bold">નવો ઓર્ડર</h1>
          <span className="w-11" />
        </div>

        {error ? <p className="text-center text-danger">{error}</p> : null}

        {loading ? (
          <LoadingState />
        ) : menuItems.length === 0 ? (
          <EmptyState title="મેનુમાં કોઈ આઇટમ નથી" hint="પહેલા મેનુમાં આઇટમ ઉમેરો" />
        ) : (
          <div className="flex flex-col gap-6">
            {MENU_CATEGORIES.map((category) => {
              const categoryItems = menuItems.filter((item) => item.category === category);
              if (categoryItems.length === 0) return null;
              return (
                <CategorySection key={category} title={category}>
                  {categoryItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      name={item.name}
                      price={item.price}
                      quantity={cart[item.id] ?? 0}
                      onClick={() => addItem(item.id)}
                    />
                  ))}
                </CategorySection>
              );
            })}
          </div>
        )}
      </div>

      <OrderSummary
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        lines={lines}
        totalAmount={totalAmount}
        onIncrement={incrementItem}
        onDecrement={decrementItem}
        footer={<SwipeToSend disabled={lines.length === 0} onComplete={handleSend} />}
      />

      <SuccessDialog open={success !== null}>
        {success ? (
          <div className="flex flex-col items-center gap-2">
            {success.customerName ? (
              <p className="text-lg text-text-muted">{success.customerName}</p>
            ) : null}
            <p className="text-7xl font-extrabold text-brand">{success.tokenNumber}</p>
            <p className="text-2xl font-semibold">₹{success.totalAmount}</p>
          </div>
        ) : null}
      </SuccessDialog>
    </main>
  );
}
