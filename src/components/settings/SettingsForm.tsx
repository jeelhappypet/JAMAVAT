"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { RestaurantSettingsDTO } from "@/types";

const inputClass = "h-12 w-full rounded-xl border border-stone-300 bg-surface px-3.5 text-base font-normal";

/** Restaurant name (header, login, guest pages) and the details printed in the thank-you email. */
export function SettingsForm({ initial, mailReady }: { initial: RestaurantSettingsDTO; mailReady: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ name: initial.name, address: initial.address ?? "", phone: initial.phone ?? "", reviewUrl: initial.reviewUrl ?? "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setSaved(false);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName: form.name, address: form.address, phone: form.phone, reviewUrl: form.reviewUrl }),
      });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("err.saveFailed"));
      setForm({ name: data.name, address: data.address ?? "", phone: data.phone ?? "", reviewUrl: data.reviewUrl ?? "" });
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
          <input type="text" {...field("name")} className={inputClass} />
          <span className="text-[13px] font-normal text-text-muted">{t("settings.restaurantHint")}</span>
        </label>

        <h2 className="mt-2 text-[17px] font-extrabold">{t("settings.emailTitle")}</h2>
        <p className="-mt-2 text-[13px] text-text-muted">{mailReady ? t("settings.emailHint") : t("settings.emailOff")}</p>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          {t("settings.address")}
          <input type="text" {...field("address")} className={inputClass} autoComplete="street-address" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          {t("settings.phone")}
          <input type="tel" {...field("phone")} className={inputClass} autoComplete="tel" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          {t("settings.reviewUrl")}
          <input type="url" inputMode="url" placeholder="https://g.page/r/…" {...field("reviewUrl")} className={inputClass} />
          <span className="text-[13px] font-normal text-text-muted">{t("settings.reviewHint")}</span>
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
