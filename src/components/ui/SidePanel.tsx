"use client";

import { useEffect, useId, type ReactNode } from "react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface SidePanelProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Overlay for a feed/list that doesn't fit a centered `Modal` (e.g. the HQ
 * activity log): docked to the right edge on `sm:` and up, a bottom sheet
 * below that — same backdrop/Escape/close-button contract as `Modal`.
 */
export function SidePanel({ open, title, onClose, children, className }: SidePanelProps) {
  const titleId = useId();
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label={t("common.close")} onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div
        className={cn(
          "relative flex max-h-[85dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-[20px] bg-surface p-6 text-foreground shadow-lg sm:h-dvh sm:max-h-dvh sm:w-[400px] sm:rounded-t-none sm:rounded-l-[20px]",
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-xl font-extrabold">
            {title}
          </h2>
          <IconButton label={t("common.close")} size="sm" onClick={onClose} className="-mr-1.5 -mt-1.5 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
