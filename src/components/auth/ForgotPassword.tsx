"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { AccountAuthLayout } from "@/components/auth/AccountAuthLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Requests a reset link. Deliberately not enumeration-safe — says plainly when the email isn't registered, per the owner's ask. */
export function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("forgotPassword.errNotFound"));
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("forgotPassword.errNotFound"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountAuthLayout title={t("forgotPassword.title")} subtitle={sent ? undefined : t("forgotPassword.subtitle")}>
      {sent ? (
        <Alert tone="success">{t("forgotPassword.sent", { email })}</Alert>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <TextField label={t("forgotPassword.email")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" size="lg" disabled={busy || !email}>
            {busy ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
          </Button>
        </form>
      )}
      <Link href="/login" className="self-start text-sm font-bold text-brand-dark">
        {t("forgotPassword.backToLogin")}
      </Link>
    </AccountAuthLayout>
  );
}
