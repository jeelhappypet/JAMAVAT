"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";

export type EntityKind = "menu" | "category" | "item";

export interface EntityValues {
  name: string;
  nameGu: string;
  price: string;
  isVeg: boolean;
  categoryId: string;
  description: string;
  descriptionGu: string;
  isBestseller: boolean;
}

interface MenuEntityDialogProps {
  kind: EntityKind;
  mode: "create" | "edit";
  initial: Partial<EntityValues>;
  /** Item dialogs only: where the dish can live. */
  categoryOptions?: { id: string; label: string }[];
  onClose: () => void;
  /** Returns an error message to show, or null on success. */
  onSubmit: (values: EntityValues) => Promise<string | null>;
}

const TITLES: Record<EntityKind, Record<"create" | "edit", MessageKey>> = {
  menu: { create: "menu.addMenu", edit: "menu.editMenu" },
  category: { create: "menu.addCategory", edit: "menu.editCategory" },
  item: { create: "menu.addItem", edit: "menu.editItem" },
};

const inputClass = "h-12 w-full rounded-xl border border-stone-300 bg-surface px-3.5 text-base font-normal";
const labelClass = "flex flex-col gap-1.5 text-sm font-bold";

export function MenuEntityDialog({ kind, mode, initial, categoryOptions = [], onClose, onSubmit }: MenuEntityDialogProps) {
  const { t } = useI18n();
  const [values, setValues] = useState<EntityValues>({
    name: initial.name ?? "",
    nameGu: initial.nameGu ?? "",
    price: initial.price ?? "",
    isVeg: initial.isVeg ?? true,
    categoryId: initial.categoryId ?? categoryOptions[0]?.id ?? "",
    description: initial.description ?? "",
    descriptionGu: initial.descriptionGu ?? "",
    isBestseller: initial.isBestseller ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof EntityValues>(key: K, value: EntityValues[K]) => setValues((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) return setError(t("err.enterName"));
    if (kind === "item" && (values.price === "" || Number.isNaN(Number(values.price)) || Number(values.price) < 0)) {
      return setError(t("err.priceInvalid"));
    }
    setSaving(true);
    setError(null);
    const message = await onSubmit(values);
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="entity-dialog-title">
      <form onSubmit={handleSubmit} className="flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[20px] bg-surface p-6 shadow-lg">
        <h2 id="entity-dialog-title" className="text-xl font-extrabold">
          {t(TITLES[kind][mode])}
        </h2>

        <label className={labelClass}>
          {t("menu.nameEn")}
          <input type="text" value={values.name} onChange={(e) => set("name", e.target.value)} className={inputClass} autoFocus />
        </label>
        <label className={labelClass}>
          {t("menu.nameGu")}
          <input type="text" lang="gu" value={values.nameGu} onChange={(e) => set("nameGu", e.target.value)} className={inputClass} />
          <span className="text-[13px] font-normal text-text-muted">{t("menu.nameGuHint")}</span>
        </label>

        {kind === "item" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                {t("menu.price")}
                <input type="number" inputMode="decimal" min={0} step="any" value={values.price} onChange={(e) => set("price", e.target.value)} className={inputClass} />
              </label>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-sm font-bold">{t("menu.type")}</legend>
                <div className="flex h-12 rounded-xl bg-stone-200 p-[3px]">
                  {[true, false].map((isVeg) => (
                    <button
                      key={String(isVeg)}
                      type="button"
                      aria-pressed={values.isVeg === isVeg}
                      onClick={() => set("isVeg", isVeg)}
                      className={`flex-1 rounded-[9px] text-sm font-bold ${values.isVeg === isVeg ? "bg-surface text-brand-dark shadow-sm" : "text-text-muted"}`}
                    >
                      {isVeg ? t("menu.veg") : t("menu.nonVeg")}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <label className={labelClass}>
              {t("menu.description")}
              <input type="text" maxLength={140} value={values.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>
              {t("menu.descriptionGu")}
              <input type="text" lang="gu" maxLength={140} value={values.descriptionGu} onChange={(e) => set("descriptionGu", e.target.value)} className={inputClass} />
              <span className="text-[13px] font-normal text-text-muted">{t("menu.descriptionHint")}</span>
            </label>
            <label className="flex items-center gap-2.5 text-sm font-bold">
              <input type="checkbox" checked={values.isBestseller} onChange={(e) => set("isBestseller", e.target.checked)} className="h-5 w-5 accent-[#c2410c]" />
              {t("menu.bestseller")}
            </label>
            {categoryOptions.length > 1 ? (
              <label className={labelClass}>
                {t("menu.category")}
                <select value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputClass}>
                  {categoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        ) : null}

        {error ? (
          <p role="alert" className="font-semibold text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex gap-3">
          <button type="button" onClick={onClose} className="h-12 flex-1 rounded-xl border border-stone-300 bg-surface text-base font-bold">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={saving} className="h-12 flex-1 rounded-xl bg-brand text-base font-extrabold text-white disabled:opacity-60">
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
