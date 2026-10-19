"use client";

import { useEffect, useId, type FormEvent, type ReactNode } from "react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface ModalProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Buttons row at the bottom. */
  footer?: ReactNode;
  /** Wraps the body in a <form> so Enter submits. */
  onSubmit?: (e: FormEvent) => void;
  size?: "sm" | "md";
}

/** The one dialog shell: dimmed backdrop, Escape closes, explicit close button, optional form wrapper. */
export function Modal({ open, title, onClose, children, footer, onSubmit, size = "md" }: ModalProps) {
  const titleId = useId();
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  const panel = cn("flex max-h-full w-full flex-col gap-4 overflow-y-auto rounded-[20px] bg-surface p-6 text-foreground shadow-lg", size === "sm" ? "max-w-sm" : "max-w-md");
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h2 id={titleId} className="text-xl font-extrabold">
          {title}
        </h2>
        <IconButton label={t("common.close")} size="sm" onClick={onClose} className="-mr-1.5 -mt-1.5 shrink-0" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </IconButton>
      </div>
      {children}
      {footer ? <div className="mt-2 flex gap-3">{footer}</div> : null}
    </>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {onSubmit ? (
        <form onSubmit={onSubmit} className={panel}>
          {body}
        </form>
      ) : (
        <div className={panel}>{body}</div>
      )}
    </div>
  );
}
