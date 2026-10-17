"use client";

import { useState } from "react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PIN_PATTERN } from "@/lib/auth/constants";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 4);

/** The owner creates their restaurant's first login from the invite link HQ emailed. */
export function WelcomeForm({ slug, restaurantName, invite }: { slug: string; restaurantName: string; invite: string }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!PIN_PATTERN.test(pin)) return setError(t("err.pinFormat"));
    if (pin !== confirmPin) return setError(t("err.pinMismatch"));

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, invite, name, pin }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("err.setupFailed"));
      // Full navigation so the proxy and every page see the new cookie.
      window.location.assign(data.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.setupFailed"));
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-muted">
      <AuthHeader restaurantName={restaurantName} />
      <main className="flex flex-1 items-center justify-center px-[clamp(16px,3vw,32px)] pb-10 pt-4">
        <form onSubmit={handleSubmit} className="flex w-full max-w-[480px] flex-col gap-4 rounded-3xl border border-border bg-surface p-7">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] font-extrabold tracking-tight">{t("welcome.title")}</h1>
            <p className="text-[15px] text-text-muted">{t("welcome.subtitle", { name: restaurantName })}</p>
          </div>
          <TextField label={t("setup.yourName")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t("setup.pin")}
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(digitsOnly(e.target.value))}
              autoComplete="off"
              inputClassName="text-center tracking-[0.4em]"
            />
            <TextField
              label={t("setup.repeatPin")}
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(digitsOnly(e.target.value))}
              autoComplete="off"
              inputClassName="text-center tracking-[0.4em]"
            />
          </div>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? t("setup.submitting") : t("setup.submit")}
          </Button>
        </form>
      </main>
    </div>
  );
}
