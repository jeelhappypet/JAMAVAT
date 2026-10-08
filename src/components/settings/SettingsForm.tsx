"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { RestaurantSettingsDTO } from "@/types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";

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
        <TextField label={t("settings.restaurantName")} hint={t("settings.restaurantHint")} {...field("name")} />

        <h2 className="mt-2 text-[17px] font-extrabold">{t("settings.emailTitle")}</h2>
        <p className="-mt-2 text-[13px] text-text-muted">{mailReady ? t("settings.emailHint") : t("settings.emailOff")}</p>
        <TextField label={t("settings.address")} autoComplete="street-address" {...field("address")} />
        <TextField label={t("settings.phone")} type="tel" autoComplete="tel" {...field("phone")} />
        <TextField label={t("settings.reviewUrl")} hint={t("settings.reviewHint")} type="url" inputMode="url" placeholder="https://g.page/r/…" {...field("reviewUrl")} />

        {error ? <Alert>{error}</Alert> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
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
