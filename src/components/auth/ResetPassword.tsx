"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { AccountAuthLayout } from "@/components/auth/AccountAuthLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function ResetPassword({ token }: { token?: string }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError(t("resetPassword.mismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("resetPassword.invalidToken"));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resetPassword.invalidToken"));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AccountAuthLayout title={t("resetPassword.title")}>
        <Alert>{t("resetPassword.invalidToken")}</Alert>
        <Link href="/forgot-password" className="self-start text-sm font-bold text-brand-dark">
          {t("resetPassword.requestNew")}
        </Link>
      </AccountAuthLayout>
    );
  }

  if (done) {
    return (
      <AccountAuthLayout title={t("resetPassword.title")}>
        <Alert tone="success">{t("resetPassword.success")}</Alert>
        <Link href="/login" className="self-start text-sm font-bold text-brand-dark">
          {t("resetPassword.goToLogin")}
        </Link>
      </AccountAuthLayout>
    );
  }

  return (
    <AccountAuthLayout title={t("resetPassword.title")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("resetPassword.newPassword")} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        <TextField label={t("resetPassword.confirm")} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" disabled={busy || !password || !confirm}>
          {busy ? t("resetPassword.submitting") : t("resetPassword.submit")}
        </Button>
      </form>
    </AccountAuthLayout>
  );
}
