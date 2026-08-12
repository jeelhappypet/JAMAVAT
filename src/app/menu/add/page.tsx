"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HomeButton } from "@/components/ui/HomeButton";
import { Button } from "@/components/ui/Button";
import { MENU_CATEGORIES, type MenuCategory } from "@/types";

interface DraftRow {
  key: number;
  name: string;
  category: MenuCategory;
  price: string;
}

let nextKey = 1;

function emptyRow(): DraftRow {
  return { key: nextKey++, name: "", category: MENU_CATEGORIES[0], price: "" };
}

export default function AddMenuPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateRow(key: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev));
  }

  async function handleSave() {
    const filled = rows.filter((row) => row.name.trim().length > 0);

    if (filled.length === 0) {
      setError("ઓછામાં ઓછી એક આઇટમનું નામ લખો");
      return;
    }

    for (const row of filled) {
      const priceValue = Number(row.price);
      if (!row.price || Number.isNaN(priceValue) || priceValue <= 0) {
        setError(`"${row.name}" માટે માન્ય ભાવ લખો`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: filled.map((row) => ({
            name: row.name.trim(),
            category: row.category,
            price: Number(row.price),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "મેનુ સાચવી શકાયું નથી");
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "મેનુ સાચવી શકાયું નથી");
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <HomeButton />
        <h1 className="text-xl font-bold">આઇટમ ઉમેરો</h1>
        <span className="w-11" />
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <div key={row.key} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-muted">આઇટમ {index + 1}</span>
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="touch-target text-sm text-danger"
                >
                  દૂર કરો
                </button>
              ) : null}
            </div>

            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(row.key, { name: e.target.value })}
              placeholder="આઇટમનું નામ"
              className="touch-target rounded-xl border border-border bg-background px-4 text-base"
            />

            <div className="flex gap-2">
              <select
                value={row.category}
                onChange={(e) => updateRow(row.key, { category: e.target.value as MenuCategory })}
                className="touch-target flex-1 rounded-xl border border-border bg-background px-3 text-base"
              >
                {MENU_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={row.price}
                onChange={(e) => updateRow(row.key, { price: e.target.value })}
                placeholder="ભાવ (₹)"
                className="touch-target w-32 rounded-xl border border-border bg-background px-4 text-base"
              />
            </div>
          </div>
        ))}
      </div>

      <Button variant="secondary" size="lg" onClick={addRow} className="w-full">
        આઇટમ ઉમેરો
      </Button>

      {error ? <p className="text-center text-danger">{error}</p> : null}

      <Button size="xl" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "સાચવી રહ્યા છીએ…" : "મેનુ સાચવો"}
      </Button>
    </main>
  );
}
