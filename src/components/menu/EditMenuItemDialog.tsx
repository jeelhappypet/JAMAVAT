"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MENU_CATEGORIES, type MenuCategory, type MenuItemDTO } from "@/types";

interface EditMenuItemDialogProps {
  item: MenuItemDTO | null;
  onSave: (updates: { name: string; category: MenuCategory; price: number }) => Promise<void>;
  onClose: () => void;
}

export function EditMenuItemDialog({ item, onSave, onClose }: EditMenuItemDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MenuCategory>(MENU_CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedItemId, setLoadedItemId] = useState<string | null>(null);

  // Reset the form when a different item is opened for editing — the
  // React-recommended way to sync local state from a prop change is to
  // adjust it during render, not in an effect.
  if (item && item.id !== loadedItemId) {
    setLoadedItemId(item.id);
    setName(item.name);
    setCategory(item.category);
    setPrice(String(item.price));
    setError(null);
    setSaving(false);
  } else if (!item && loadedItemId !== null) {
    // Dialog closed — clear tracking so reopening the same item re-syncs.
    setLoadedItemId(null);
  }

  if (!item) return null;

  async function handleSave() {
    const trimmedName = name.trim();
    const priceValue = Number(price);

    if (!trimmedName) {
      setError("આઇટમનું નામ જરૂરી છે");
      return;
    }
    if (!price || Number.isNaN(priceValue) || priceValue <= 0) {
      setError("માન્ય ભાવ લખો");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({ name: trimmedName, category, price: priceValue });
    } catch (err) {
      setError(err instanceof Error ? err.message : "સાચવી શકાયું નથી");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-2xl bg-surface p-6 shadow-lg">
        <h2 className="text-xl font-semibold">આઇટમ સંપાદિત કરો</h2>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="આઇટમનું નામ"
          className="touch-target rounded-xl border border-border bg-background px-4 text-base"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as MenuCategory)}
          className="touch-target rounded-xl border border-border bg-background px-3 text-base"
        >
          {MENU_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="ભાવ (₹)"
          className="touch-target rounded-xl border border-border bg-background px-4 text-base"
        />

        {error ? <p className="text-center text-danger">{error}</p> : null}

        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose} disabled={saving}>
            રદ કરો
          </Button>
          <Button size="lg" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "સાચવી રહ્યા છીએ…" : "સાચવો"}
          </Button>
        </div>
      </div>
    </div>
  );
}
