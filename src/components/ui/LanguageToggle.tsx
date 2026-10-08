"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Lang } from "@/lib/i18n/messages";

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: "en", label: "EN" },
  { lang: "gu", label: "ગુ" },
];

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div role="group" aria-label={t("lang.switch")} className="flex rounded-xl bg-stone-200 p-[3px]">
      {OPTIONS.map((option) => {
        const active = option.lang === lang;
        return (
          <button
            key={option.lang}
            type="button"
            aria-pressed={active}
            onClick={() => !active && setLang(option.lang)}
            className={`h-[38px] min-w-11 rounded-[9px] px-2 text-sm font-bold ${
              active ? "bg-surface text-brand-dark shadow-sm" : "text-text-muted"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
