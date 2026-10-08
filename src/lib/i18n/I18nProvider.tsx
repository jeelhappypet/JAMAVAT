"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, makeTranslator, type Lang, type Translate } from "@/lib/i18n/messages";

interface I18nValue {
  lang: Lang;
  t: Translate;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function I18nProvider({ lang: initialLang, children }: { lang: Lang; children: ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState(initialLang);

  const setLang = useCallback(
    (next: Lang) => {
      // A plain cookie (not HttpOnly) so server components render the same language on the next request.
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
      document.documentElement.lang = next;
      setLangState(next);
      router.refresh();
    },
    [router]
  );

  const value = useMemo(() => ({ lang, t: makeTranslator(lang), setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
