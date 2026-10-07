"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function SettingsForm({ initialRestaurantName }: { initialRestaurantName: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState(initialRestaurantName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName }),
      });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("err.saveFailed"));
      setRestaurantName(data.restaurantName);
      setSaved(true);
      router.refresh(); // header shows the new name
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="text-[26px] font-extrabold tracking-tight">{t("settings.title")}</h1>

      <form onSubmit={handleSubmit} className="flex max-w-[640px] flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-[18px]">
        <h2 className="text-[17px] font-extrabold">{t("settings.restaurant")}</h2>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          {t("settings.restaurantName")}
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => {
              setRestaurantName(e.target.value);
              setSaved(false);
            }}
            className="h-12 w-full rounded-xl border border-stone-300 bg-surface px-3.5 text-base font-normal"
          />
          <span className="text-[13px] font-normal text-text-muted">{t("settings.restaurantHint")}</span>
        </label>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="h-[46px] rounded-xl bg-brand px-[18px] text-[15px] font-extrabold text-white disabled:opacity-60">
            {saving ? t("common.saving") : t("common.save")}
          </button>
          {saved ? (
            <span role="status" className="flex items-center gap-1.5 text-sm font-semibold text-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
              {t("common.saved")}
            </span>
          ) : null}
        </div>
      </form>
    </>
  );
}
