import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import type { Lang } from "@/lib/i18n/messages";

/** Header, content, footer — the shape every public page shares. */
export function SitePage({ lang, path = "/", children }: { lang: Lang; path?: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader lang={lang} path={path} />
      <main className="flex-1">{children}</main>
      <SiteFooter lang={lang} />
    </>
  );
}
