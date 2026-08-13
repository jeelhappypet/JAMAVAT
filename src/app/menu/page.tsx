"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HomeButton } from "@/components/ui/HomeButton";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategorySection } from "@/components/menu/CategorySection";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import { MENU_CATEGORIES } from "@/types";
import type { MenuItemDTO } from "@/types";

const POLL_MS = 30000;

export default function MenuPage() {
  const [items, setItems] = useState<MenuItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/menu");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items);
      setError(null);
    } catch {
      setError("મેનુ લાવી શકાયું નથી");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  const { state } = useRealtime({ [REALTIME_EVENTS.MENU_UPDATED]: load });
  usePeriodicRefresh(load, POLL_MS, state !== "connected");

  async function toggleActive(item: MenuItemDTO) {
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, isActive: !it.isActive } : it))
    );
    try {
      const res = await fetch("/api/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isActive: item.isActive } : it))
      );
      setError("બદલાવ સાચવી શકાયો નથી");
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <HomeButton />
        <h1 className="text-xl font-bold">મેનુ</h1>
        <Link href="/menu/add">
          <Button size="lg" aria-label="આઇટમ ઉમેરો">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Button>
        </Link>
      </div>

      {error ? <p className="text-center text-danger">{error}</p> : null}

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState title="મેનુમાં કોઈ આઇટમ નથી" hint="+ દબાવીને નવી આઇટમ ઉમેરો" />
      ) : (
        <div className="flex flex-col gap-6">
          {MENU_CATEGORIES.map((category) => {
            const categoryItems = items.filter((item) => item.category === category);
            if (categoryItems.length === 0) return null;
            return (
              <CategorySection key={category} title={category}>
                {categoryItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    name={item.name}
                    price={item.price}
                    trailing={
                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        className={`touch-target mt-2 self-start rounded-full px-3 py-1 text-xs font-semibold ${
                          item.isActive
                            ? "bg-success-light text-success"
                            : "bg-surface-muted text-text-muted"
                        }`}
                      >
                        {item.isActive ? "સક્રિય" : "નિષ્ક્રિય"}
                      </button>
                    }
                  />
                ))}
              </CategorySection>
            );
          })}
        </div>
      )}
    </main>
  );
}
