"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { resizeDishPhoto } from "@/lib/utils/dishPhoto";
import { Button } from "@/components/ui/Button";
import { DishPhoto } from "@/components/menu/DishPhoto";

/** What the dialog should do with the photo once the dish itself is saved. */
export type PhotoChange = { kind: "keep" } | { kind: "set"; blob: Blob } | { kind: "remove" };

interface DishPhotoFieldProps {
  currentUrl?: string;
  /** False until a Vercel Blob store is connected — the field explains instead of failing on save. */
  enabled: boolean;
  value: PhotoChange;
  onChange: (change: PhotoChange) => void;
}

export function DishPhotoField({ currentUrl, enabled, value, onChange }: DishPhotoFieldProps) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // A picked photo previews from memory; free it when replaced or closed.
  useEffect(() => {
    if (value.kind !== "set") return;
    const url = URL.createObjectURL(value.blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL tied to the picked blob's lifetime
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const shown = value.kind === "set" ? preview : value.kind === "remove" ? null : currentUrl ?? null;

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange({ kind: "set", blob: await resizeDishPhoto(file) });
    } catch {
      setError(t("err.photoType"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{t("menu.photo")}</span>
      {enabled ? (
        <div className="flex items-center gap-3">
          {shown ? (
            <DishPhoto src={shown} alt={t("menu.photo")} />
          ) : (
            <span className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-xs font-semibold text-text-muted">
              {t("menu.photoNone")}
            </span>
          )}
          <div className="flex flex-col items-start gap-1">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? t("menu.photoResizing") : shown ? t("menu.photoChange") : t("menu.photoAdd")}
            </Button>
            {shown ? (
              <Button variant="link" size="inline" className="text-danger" onClick={() => onChange(currentUrl ? { kind: "remove" } : { kind: "keep" })}>
                {t("menu.photoRemove")}
              </Button>
            ) : null}
          </div>
          <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      ) : (
        <p className="text-[13px] text-text-muted">{t("menu.photoOff")}</p>
      )}
      {enabled && !error ? <p className="text-xs text-text-muted">{t("menu.photoHint")}</p> : null}
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
