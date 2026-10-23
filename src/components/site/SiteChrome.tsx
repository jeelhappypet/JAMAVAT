import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { SiteIcon } from "@/components/site/SiteIcon";
import { CONTACT, INSTAGRAM_URL, KEYWORD_PAGES, NAV, SITE_NAME, internationalPhone, pick } from "@/lib/site/content";
import { sitePath } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

// The header needs scroll state and a menu toggle, so it lives in its own
// client component; everything else here stays server-rendered.
export { SiteHeader } from "@/components/site/SiteHeader";

// `py-2` so each link is a ~37px target rather than a 21px line of text;
// the column gap shrinks to match, so the footer does not grow much.
const linkClass = "py-2 text-[14px] text-text-muted transition-colors hover:text-brand";
const headingClass = "t-eyebrow text-foreground";

/**
 * The footer. A grid of four columns on a desktop and two on a phone — it
 * was one `flex-wrap` row whose items each claimed 180–280px, which at most
 * widths left a column stranded on a line of its own under a 60px gap. A
 * grid puts the gaps where they were asked for and nowhere else.
 */
export function SiteFooter({ lang }: { lang: Lang }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto w-full max-w-[1340px] px-[clamp(16px,3.5vw,44px)] py-[clamp(28px,3.5vw,44px)]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1.6fr_repeat(auto-fit,minmax(150px,1fr))] md:gap-x-10">
          <div className="col-span-2 flex flex-col items-start gap-3 md:col-span-1">
            <BrandMark size={40} withName />
            <p className="t-small max-w-[34ch] text-text-muted">{pick(NAV.tagline, lang)}</p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              // rel="me" is what links this page and the Instagram account as one
              // identity, the other half of the Organization schema's sameAs.
              rel="me noopener"
              data-track="instagram"
              className="inline-flex items-center gap-1.5 py-2 text-[14px] font-bold text-brand transition-colors hover:text-brand-dark"
            >
              <SiteIcon name="instagram" size={16} />@{CONTACT.instagram}
            </a>
          </div>

          {/* Every keyword page is linked from every page — a page only the sitemap points to is one Google rates as unimportant. */}
          <nav aria-label={pick(NAV.solutions, lang)} className="flex flex-col gap-0.5">
            <h2 className={`${headingClass} mb-0.5`}>{pick(NAV.solutions, lang)}</h2>
            {KEYWORD_PAGES.map((page) => (
              <Link key={page.slug} href={sitePath(lang, `/${page.slug}`)} className={linkClass}>
                {pick(page.label, lang)}
              </Link>
            ))}
          </nav>

          <nav aria-label={SITE_NAME} className="flex flex-col gap-0.5">
            <h2 className={`${headingClass} mb-0.5`}>{SITE_NAME}</h2>
            <Link href={sitePath(lang, "/pricing")} className={linkClass}>
              {pick(NAV.pricing, lang)}
            </Link>
            <a href="/login" className={linkClass}>
              {pick(NAV.staffLogin, lang)}
            </a>
            <Link href="/privacy" className={linkClass}>
              {pick(NAV.privacy, lang)}
            </Link>
            <Link href={sitePath(lang, "/terms")} className={linkClass}>
              {pick(NAV.terms, lang)}
            </Link>
          </nav>

          {/* Only when there is something to put in it: the phone, email and
              WhatsApp all come from env vars, and a preview build without them
              was rendering a heading over an empty column. */}
          {CONTACT.phone || CONTACT.email || CONTACT.whatsapp ? (
          <address className="flex flex-col gap-0.5 not-italic">
            <h2 className={`${headingClass} mb-0.5`}>{pick(NAV.contact, lang)}</h2>
            {CONTACT.phone ? (
              <a href={`tel:${internationalPhone(CONTACT.phone)}`} className={linkClass}>
                {CONTACT.phone}
              </a>
            ) : null}
            {CONTACT.email ? (
              <a href={`mailto:${CONTACT.email}`} className={linkClass}>
                {CONTACT.email}
              </a>
            ) : null}
            {CONTACT.whatsapp ? (
              <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener" className={linkClass}>
                WhatsApp
              </a>
            ) : null}
          </address>
          ) : null}
        </div>

        <p className="t-small mt-8 border-t border-border pt-4 text-text-muted">
          © {year} {SITE_NAME} · {pick(NAV.tagline, lang)}
        </p>
      </div>
    </footer>
  );
}

/** Structured data for Google. Rendered as one script per page. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
