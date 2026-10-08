"use client";

import { useState } from "react";
import { PIN_PATTERN } from "@/lib/auth/constants";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";

interface ChangePinDialogProps {
  open: boolean;
  onClose: () => void;
}

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

  const pinProps = { type: "password", inputMode: "numeric" as const, autoComplete: "off", inputClassName: "text-center text-xl tracking-[0.5em]" };
  return (
    <Modal
      open
      size="sm"
      title={t("pin.title")}
      onClose={close}
      onSubmit={done ? undefined : handleSubmit}
      footer={
        done ? (
          <Button size="lg" fullWidth onClick={close}>
            {t("common.done")}
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="lg" className="flex-1" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-[15px] leading-relaxed text-text-muted">{t("pin.done")}</p>
      ) : (
        <>
          <TextField label={t("pin.current")} value={currentPin} onChange={(e) => setCurrentPin(digitsOnly(e.target.value))} {...pinProps} />
          <TextField label={t("pin.new")} value={newPin} onChange={(e) => setNewPin(digitsOnly(e.target.value))} {...pinProps} />
          <TextField label={t("pin.repeat")} value={confirmPin} onChange={(e) => setConfirmPin(digitsOnly(e.target.value))} {...pinProps} />
          {error ? <Alert>{error}</Alert> : null}
        </>
      )}
    </Modal>
  );
}
