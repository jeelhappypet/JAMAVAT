"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getInstallPrompt, promptInstall, subscribeInstallPrompt } from "@/lib/pwa/installPrompt";

/** Only renders when the browser has offered an install (already installed, iOS, etc. → nothing). */
export function InstallAppButton() {
  const { t } = useI18n();
  const canInstall = useSyncExternalStore(
    subscribeInstallPrompt,
    () => getInstallPrompt() !== null,
    () => false
  );

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      className="flex h-11 items-center gap-2 rounded-xl border border-stone-300 bg-surface px-4 text-sm font-bold"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      {t("install.app")}
    </button>
  );
}
