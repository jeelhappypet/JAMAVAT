"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { AccountAuthLayout } from "@/components/auth/AccountAuthLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

/**
 * "Find my restaurant" login on Jamavat's own site — a new device/browser
 * has no session cookie to redirect it to `/r/{slug}/login`, so this is
 * where a restaurant's staff start instead of typing their link by hand.
 * Success just hands off to that restaurant's own PIN screen.
 */
export function OwnerLogin() {
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("ownerLogin.errInvalid"));
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/r/${data.slug}/login`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ownerLogin.errInvalid"));
      setBusy(false);
    }
  }

  return (
    <AccountAuthLayout title={t("ownerLogin.title")} subtitle={t("ownerLogin.subtitle")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("ownerLogin.identifier")} autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        <TextField label={t("ownerLogin.password")} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" disabled={busy || !identifier || !password}>
          {busy ? t("ownerLogin.submitting") : t("ownerLogin.submit")}
        </Button>
        <Link href="/forgot-password" className="self-start text-sm font-bold text-brand-dark">
          {t("ownerLogin.forgot")}
        </Link>
      </form>
    </AccountAuthLayout>
  );
}
