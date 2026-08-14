"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HomeButton } from "@/components/ui/HomeButton";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CategorySection } from "@/components/menu/CategorySection";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { EditMenuItemDialog } from "@/components/menu/EditMenuItemDialog";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import { MENU_CATEGORIES } from "@/types";
import type { MenuCategory, MenuItemDTO } from "@/types";

const POLL_MS = 30000;

export default function MenuPage() {
  const [items, setItems] = useState<MenuItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItemDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItemDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleSaveEdit(updates: { name: string; category: MenuCategory; price: number }) {
    if (!editingItem) return;
    const res = await fetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingItem.id, ...updates }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "સાચવી શકાયું નથી");

    setItems((prev) => prev.map((it) => (it.id === editingItem.id ? { ...it, ...updates } : it)));
    setEditingItem(null);
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/menu/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError("આઇટમ કાઢી શકાઈ નથી");
    } finally {
      setDeleting(false);
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
                    topRightAction={
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        aria-label="સંપાદિત કરો"
                        className="touch-target flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-text-muted shadow-sm active:bg-border"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    }
                    trailing={
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleActive(item)}
                          className={`touch-target self-start rounded-full px-3 py-1 text-xs font-semibold ${
                            item.isActive
                              ? "bg-success-light text-success"
                              : "bg-surface-muted text-text-muted"
                          }`}
                        >
                          {item.isActive ? "સક્રિય" : "નિષ્ક્રિય"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          aria-label="કાઢી નાખો"
                          className="touch-target flex h-8 w-8 items-center justify-center rounded-full bg-danger-light text-danger"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                          </svg>
                        </button>
                      </div>
                    }
                  />
                ))}
              </CategorySection>
            );
          })}
        </div>
      )}

      <EditMenuItemDialog
        item={editingItem}
        onSave={handleSaveEdit}
        onClose={() => setEditingItem(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="આઇટમ કાઢી નાખવી છે?"
        description={deleteTarget ? `"${deleteTarget.name}" કાયમ માટે કાઢી નાખવામાં આવશે.` : undefined}
        confirmLabel={deleting ? "કાઢી રહ્યા છીએ…" : "હા, કાઢી નાખો"}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}
