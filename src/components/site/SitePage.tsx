import type { ReactNode } from "react";
import { SiteAnalytics } from "@/components/site/SiteAnalytics";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import type { Lang } from "@/lib/i18n/messages";

/** Header, content, footer — the shape every public page shares. */
export function SitePage({ lang, path = "/", children }: { lang: Lang; path?: string; children: ReactNode }) {
  return (
    // The page is prerendered without the visitor's cookie, so <html lang> is always the
    // default — this marks the ગુજરાતી pages as Gujarati for search engines and screen readers.
    <div lang={lang === "gu" ? "gu" : "en"} className="flex flex-1 flex-col">
      <SiteAnalytics lang={lang} path={path} />
      <SiteHeader lang={lang} path={path} />
      <main className="flex-1">{children}</main>
      <SiteFooter lang={lang} />
    </div>
  );
}
