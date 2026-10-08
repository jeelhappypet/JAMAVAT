"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Are you sure?" — built on Modal + Button. */
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, variant = "danger", onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button variant={variant === "danger" ? "dangerSolid" : "primary"} size="lg" className="flex-1" onClick={onConfirm}>
            {confirmLabel ?? t("common.yes")}
          </Button>
        </>
      }
    >
      {description ? <p className="-mt-2 text-[15px] leading-relaxed text-text-muted">{description}</p> : null}
    </Modal>
  );
}
