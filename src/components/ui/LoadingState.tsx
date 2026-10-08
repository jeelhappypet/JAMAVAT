"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-text-muted">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-brand" />
      <p className="text-base">{label ?? t("common.loading")}</p>
    </div>
  );
}
