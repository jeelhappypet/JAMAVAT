"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Alert } from "@/components/ui/Alert";

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
    <Modal
      open
      title={t(TITLES[kind][mode])}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" size="lg" className="flex-1" disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      <TextField label={t("menu.nameEn")} value={values.name} onChange={(e) => set("name", e.target.value)} autoFocus />
      <TextField label={t("menu.nameGu")} hint={t("menu.nameGuHint")} lang="gu" value={values.nameGu} onChange={(e) => set("nameGu", e.target.value)} />

      {kind === "item" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <TextField label={t("menu.price")} type="number" inputMode="decimal" min={0} step="any" value={values.price} onChange={(e) => set("price", e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">{t("menu.type")}</span>
              <SegmentedControl
                label={t("menu.type")}
                value={values.isVeg ? "veg" : "nonveg"}
                onChange={(value) => set("isVeg", value === "veg")}
                className="[&>button]:flex-1"
                options={[
                  { value: "veg", label: t("menu.veg") },
                  { value: "nonveg", label: t("menu.nonVeg") },
                ]}
              />
            </div>
          </div>
          <TextField label={t("menu.description")} maxLength={140} value={values.description} onChange={(e) => set("description", e.target.value)} />
          <TextField label={t("menu.descriptionGu")} hint={t("menu.descriptionHint")} lang="gu" maxLength={140} value={values.descriptionGu} onChange={(e) => set("descriptionGu", e.target.value)} />
          <Checkbox checked={values.isBestseller} onChange={(checked) => set("isBestseller", checked)} label={<span className="text-sm font-bold">{t("menu.bestseller")}</span>} className="items-center" />
          {categoryOptions.length > 1 ? (
            <Select label={t("menu.category")} value={values.categoryId} onChange={(value) => set("categoryId", value)} options={categoryOptions.map((option) => ({ value: option.id, label: option.label }))} />
          ) : null}
        </>
      ) : null}

      {error ? <Alert>{error}</Alert> : null}
    </Modal>
  );
}
