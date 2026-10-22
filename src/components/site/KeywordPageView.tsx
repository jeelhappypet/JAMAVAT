import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { DeviceFrame } from "@/components/site/DeviceFrame";
import { InquiryForm } from "@/components/site/InquiryForm";
import { InstagramBand } from "@/components/site/InstagramBand";
import { Reveal } from "@/components/site/Reveal";
import { Arrow, Tick } from "@/components/site/SiteIcon";
import { INQUIRY, KEYWORD_PAGES, NAV, SECTIONS, pick, type KeywordPage } from "@/lib/site/content";
import { sitePath } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

const section = "mx-auto w-full max-w-[1340px] px-[clamp(16px,3.5vw,44px)]";

/**
 * One page about one thing restaurant owners search for. Its own words, not
 * the home page's with a different heading — a page that only repeats
 * another ranks for nothing and tells a reader nothing new.
 *
 * It was previously a single column of paragraphs with no picture on it at
 * all. These pages are where search traffic lands, so each one now leads
 * with the screen it is describing, puts its facts where they can be
 * skimmed, and ends by pointing at its three siblings — internal links from
 * a page people read are worth more than the same links in a sitemap.
 */
export function KeywordPageView({ page, lang }: { page: KeywordPage; lang: Lang }) {
  const others = KEYWORD_PAGES.filter((other) => other.slug !== page.slug);

  return (
    <>
      <section className="site-warm border-b border-border">
        <div className={`${section} flex flex-wrap items-center gap-x-[clamp(28px,4.5vw,64px)] gap-y-9 py-[clamp(32px,5vw,68px)]`}>
          <div className="flex min-w-0 flex-[1_1_400px] flex-col items-start gap-3.5">
            <span className="t-eyebrow animate-fade-up text-brand">{pick(page.eyebrow, lang)}</span>
            <h1 className="heading t-hero animate-fade-up [animation-delay:70ms]">{pick(page.heading, lang)}</h1>
            <p className="t-lead animate-fade-up max-w-[56ch] text-text-muted [animation-delay:140ms]">{pick(page.intro, lang)}</p>
            <div className="animate-fade-up mt-0.5 flex flex-row flex-wrap gap-2.5 [animation-delay:210ms]">
              <a href="#demo" data-track="demo" className={buttonClass({ size: "md", className: "site-cta sm:h-12 sm:px-[18px] sm:text-[15px]" })}>
                {pick(NAV.demo, lang)}
                <Arrow />
              </a>
              <Link href={sitePath(lang)} className={buttonClass({ variant: "secondary", size: "md", className: "sm:h-12 sm:px-[18px] sm:text-[15px]" })}>
                {pick(NAV.features, lang)}
              </Link>
            </div>
          </div>

          <div className={`animate-art-in flex min-w-0 flex-[1_1_360px] [animation-delay:180ms] ${page.imageShape === "phone" ? "justify-center" : ""}`}>
            <DeviceFrame
              src={page.image}
              alt={pick(page.imageAlt, lang)}
              shape={page.imageShape}
              priority
              sizes={page.imageShape === "phone" ? "260px" : "(min-width: 1180px) 560px, (min-width: 700px) 50vw, 90vw"}
            />
          </div>
        </div>
      </section>

      <section aria-label={pick(SECTIONS.onThisPage, lang)} className="border-b border-border bg-surface">
        <ul className={`${section} grid list-none gap-x-7 gap-y-3 py-5 p-0 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]`}>
          {page.highlights.map((highlight) => (
            <li key={highlight.en} className="t-body flex items-start gap-2 font-semibold">
              <Tick size={16} className="mt-1" />
              {pick(highlight, lang)}
            </li>
          ))}
        </ul>
      </section>

      <article className={`${section} flex max-w-[820px] flex-col gap-7 py-[clamp(36px,5vw,68px)]`}>
        {page.sections.map((part, index) => (
          <Reveal key={part.heading.en} as="section" from="up" delay={index * 70} className="flex flex-col gap-2.5">
            <h2 className="heading t-h2">{pick(part.heading, lang)}</h2>
            <p className="t-lead max-w-[68ch] text-text-muted">{pick(part.body, lang)}</p>
          </Reveal>
        ))}
      </article>

      <section aria-labelledby="related" className="border-y border-border bg-surface">
        <div className={`${section} flex flex-col gap-4 py-[clamp(32px,4vw,56px)]`}>
          <h2 id="related" className="heading t-h2">
            {pick(SECTIONS.relatedTitle, lang)}
          </h2>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {others.map((other) => (
              <Link
                key={other.slug}
                href={sitePath(lang, `/${other.slug}`)}
                className="site-lift flex flex-col gap-1.5 rounded-[16px] border border-border bg-surface-muted p-4"
              >
                <span className="heading t-h3">{pick(other.label, lang)}</span>
                <span className="t-small text-text-muted">{pick(other.teaser, lang)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <InstagramBand lang={lang} />

      <section id="demo" className="site-warm scroll-mt-20">
        <div className={`${section} flex flex-wrap items-start gap-x-12 gap-y-8 py-[clamp(36px,5vw,68px)]`}>
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
            <h2 className="heading t-h2">{pick(INQUIRY.title, lang)}</h2>
            <p className="t-lead text-text-muted">{pick(INQUIRY.body, lang)}</p>
          </div>
          <div className="min-w-0 flex-[1_1_440px]">
            <InquiryForm lang={lang} />
          </div>
        </div>
      </section>
    </>
  );
}
