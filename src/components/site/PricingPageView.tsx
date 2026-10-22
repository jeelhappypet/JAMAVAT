import { InquiryForm } from "@/components/site/InquiryForm";
import { InstagramBand } from "@/components/site/InstagramBand";
import { PricingPlans } from "@/components/site/PricingPlans";
import { Reveal } from "@/components/site/Reveal";
import { Tick } from "@/components/site/SiteIcon";
import { FAQS, HERO, INQUIRY, NAV, SECTIONS, pick } from "@/lib/site/content";
import type { PublicPlan } from "@/lib/site/plans";
import type { Lang } from "@/lib/i18n/messages";

const section = "mx-auto w-full max-w-[1340px] px-[clamp(16px,3.5vw,44px)]";

/** The pricing page: the public plans, what a subscription includes, and the demo form. */
export function PricingPageView({ lang, plans }: { lang: Lang; plans: PublicPlan[] }) {
  const costFaq = FAQS[FAQS.length - 1];

  return (
    <>
      <section className="site-warm border-b border-border">
        <div className={`${section} flex flex-col items-center gap-3.5 py-[clamp(32px,5vw,68px)] text-center`}>
          <span className="t-eyebrow animate-fade-up text-brand">{pick(NAV.pricing, lang)}</span>
          <h1 className="heading t-hero animate-fade-up max-w-[18ch] [animation-delay:70ms]">{pick(SECTIONS.pricingTitle, lang)}</h1>
          <p className="t-lead animate-fade-up max-w-[58ch] text-text-muted [animation-delay:140ms]">{pick(SECTIONS.pricingBody, lang)}</p>
          <ul className="animate-fade-up t-small mt-0.5 flex list-none flex-wrap justify-center gap-x-5 gap-y-1.5 p-0 font-semibold [animation-delay:210ms]">
            {HERO.points.map((point) => (
              <li key={point.en} className="flex items-center gap-1.5">
                <Tick size={15} />
                {pick(point, lang)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className={`${section} flex flex-col items-center py-[clamp(32px,4.5vw,60px)]`}>
        <Reveal from="scale" className="w-full max-w-[920px]">
          <PricingPlans lang={lang} plans={plans} />
        </Reveal>

        <Reveal as="section" from="up" className="mt-8 flex w-full max-w-[920px] flex-col gap-2.5 rounded-[18px] border border-border bg-surface p-[clamp(18px,2.5vw,28px)]">
          <h2 className="heading t-h2">{pick(costFaq.q, lang)}</h2>
          <p className="t-lead max-w-[68ch] text-text-muted">{pick(costFaq.a, lang)}</p>
        </Reveal>
      </div>

      <InstagramBand lang={lang} />

      <section id="demo" className="site-warm scroll-mt-20">
        <div className={`${section} flex flex-wrap items-start gap-x-12 gap-y-8 py-[clamp(36px,5vw,68px)]`}>
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
            <h2 className="heading t-h2">{pick(INQUIRY.title, lang)}</h2>
            <p className="t-lead text-text-muted">{pick(INQUIRY.body, lang)}</p>
          </div>
          <div className="min-w-0 flex-[1_1_420px]">
            <InquiryForm lang={lang} />
          </div>
        </div>
      </section>
    </>
  );
}
