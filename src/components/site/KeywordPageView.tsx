import { buttonClass } from "@/components/ui/Button";
import { InquiryForm } from "@/components/site/InquiryForm";
import { INQUIRY, NAV, pick, type KeywordPage } from "@/lib/site/content";
import { sitePath } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

/**
 * One page about one thing restaurant owners search for. Its own words, not
 * the home page's with a different heading — a page that only repeats
 * another ranks for nothing and tells a reader nothing new.
 */
export function KeywordPageView({ page, lang }: { page: KeywordPage; lang: Lang }) {
  return (
    <article className="mx-auto w-full max-w-[860px] px-[clamp(16px,4vw,40px)] py-[clamp(32px,6vw,72px)]">
      <h1 className="text-[clamp(30px,4.4vw,46px)] font-extrabold leading-[1.1] tracking-[-0.02em]">{pick(page.heading, lang)}</h1>
      <p className="mt-5 text-lg leading-relaxed text-stone-700">{pick(page.intro, lang)}</p>

      {page.sections.map((section) => (
        <section key={section.heading.en} className="mt-8 flex flex-col gap-2.5">
          <h2 className="text-2xl font-extrabold tracking-[-0.01em]">{pick(section.heading, lang)}</h2>
          <p className="text-base leading-relaxed text-stone-700">{pick(section.body, lang)}</p>
        </section>
      ))}

      <div className="mt-10 flex flex-wrap gap-3">
        <a href="#demo" className={buttonClass({ size: "xl" })}>
          {pick(NAV.demo, lang)}
        </a>
        <a href={sitePath(lang)} className={buttonClass({ variant: "secondary", size: "xl" })}>
          {pick(NAV.features, lang)}
        </a>
      </div>

      <section id="demo" className="mt-12 scroll-mt-4 flex flex-col gap-4">
        <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">{pick(INQUIRY.title, lang)}</h2>
        <p className="text-base leading-relaxed text-text-muted">{pick(INQUIRY.body, lang)}</p>
        <InquiryForm lang={lang} />
      </section>
    </article>
  );
}
