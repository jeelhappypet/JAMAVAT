import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { buttonClass } from "@/components/ui/Button";
import { CONTACT, KEYWORD_PAGES, NAV, SITE_NAME, internationalPhone, pick } from "@/lib/site/content";
import { sitePath } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

/**
 * Header and footer of Jamavat's own website. Server-rendered with plain
 * links: the language switch moves to the other language's page (a real
 * address Google can index), never a cookie.
 */
export function SiteHeader({ lang, path = "/" }: { lang: Lang; path?: string }) {
  const other: Lang = lang === "gu" ? "en" : "gu";
  const anchor = (hash: string) => (path === "/" ? hash : `${sitePath(lang)}${hash}`);

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-[clamp(16px,4vw,40px)] py-3.5">
        <Link href={sitePath(lang)} className="flex items-center gap-2.5" aria-label={SITE_NAME}>
          <BrandMark size={40} withName />
        </Link>
        <nav aria-label={SITE_NAME} className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] font-semibold">
          <a href={anchor("#features")} className="py-2">
            {pick(NAV.features, lang)}
          </a>
          <a href={anchor("#how")} className="py-2">
            {pick(NAV.how, lang)}
          </a>
          <Link href={sitePath(lang, "/pricing")} className="py-2">
            {pick(NAV.pricing, lang)}
          </Link>
          <a href={anchor("#faq")} className="py-2">
            {pick(NAV.faq, lang)}
          </a>
          <Link
            href={sitePath(other, path)}
            hrefLang={other}
            className="rounded-[10px] bg-surface-muted px-2.5 py-1.5 text-sm font-bold text-text-muted"
          >
            {other === "gu" ? "ગુજરાતી" : "English"}
          </Link>
          {/* A full page load: the website is prerendered in English, and the login screen must pick up the staff's own language. */}
          <a href="/login" className="py-2">
            {pick(NAV.staffLogin, lang)}
          </a>
          <a href={anchor("#demo")} className={buttonClass({ size: "lg" })}>
            {pick(NAV.demo, lang)}
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ lang }: { lang: Lang }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-[clamp(16px,4vw,40px)] py-6 text-sm text-text-muted">
        {/* Every keyword page is linked from every page — a page only the sitemap points to is one Google rates as unimportant. */}
        <nav aria-label={pick(NAV.solutions, lang)} className="flex basis-full flex-wrap gap-x-5 gap-y-2 font-semibold">
          {KEYWORD_PAGES.map((page) => (
            <Link key={page.slug} href={sitePath(lang, `/${page.slug}`)}>
              {pick(page.label, lang)}
            </Link>
          ))}
        </nav>
        <span>
          © {year} {SITE_NAME} · {pick(NAV.tagline, lang)}
        </span>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
          <Link href="/privacy">{pick(NAV.privacy, lang)}</Link>
          <Link href={sitePath(lang, "/terms")}>{pick(NAV.terms, lang)}</Link>
          {CONTACT.phone ? <a href={`tel:${internationalPhone(CONTACT.phone)}`}>{CONTACT.phone}</a> : null}
          {CONTACT.email ? <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> : null}
        </nav>
      </div>
    </footer>
  );
}

/** Structured data for Google. Rendered as one script per page. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
