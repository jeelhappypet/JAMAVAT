"use client";

import { useState } from "react";
import { PIN_PATTERN } from "@/lib/auth/constants";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface ChangePinDialogProps {
  open: boolean;
  onClose: () => void;
}

const inputClass = "h-12 w-full rounded-xl border border-stone-300 bg-surface px-3.5 text-center text-xl tracking-[0.5em]";
const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 4);

export function ChangePinDialog({ open, onClose }: ChangePinDialogProps) {
  const { t } = useI18n();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  function close() {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError(null);
    setDone(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!PIN_PATTERN.test(currentPin) || !PIN_PATTERN.test(newPin)) return setError(t("err.pinFormat"));
    if (newPin !== confirmPin) return setError(t("err.pinMismatch"));

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("err.changePinFailed"));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.changePinFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="change-pin-title">
      <div className="w-full max-w-sm rounded-[20px] bg-surface p-6 shadow-lg">
        <h2 id="change-pin-title" className="text-xl font-extrabold">
          {t("pin.title")}
        </h2>

        {done ? (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-text-muted">{t("pin.done")}</p>
            <button type="button" onClick={close} className="mt-6 h-12 w-full rounded-xl bg-brand text-base font-extrabold text-white">
              {t("common.done")}
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              {t("pin.current")}
              <input type="password" inputMode="numeric" autoComplete="off" value={currentPin} onChange={(e) => setCurrentPin(digitsOnly(e.target.value))} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              {t("pin.new")}
              <input type="password" inputMode="numeric" autoComplete="off" value={newPin} onChange={(e) => setNewPin(digitsOnly(e.target.value))} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              {t("pin.repeat")}
              <input type="password" inputMode="numeric" autoComplete="off" value={confirmPin} onChange={(e) => setConfirmPin(digitsOnly(e.target.value))} className={inputClass} />
            </label>
            {error ? (
              <p role="alert" className="font-semibold text-danger">
                {error}
              </p>
            ) : null}
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={close} className="h-12 flex-1 rounded-xl border border-stone-300 bg-surface text-base font-bold">
                {t("common.cancel")}
              </button>
              <button type="submit" disabled={saving} className="h-12 flex-1 rounded-xl bg-brand text-base font-extrabold text-white disabled:opacity-60">
                {saving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
