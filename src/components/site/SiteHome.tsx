import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { InquiryForm } from "@/components/site/InquiryForm";
import { PricingPlans } from "@/components/site/PricingPlans";
import { Reveal } from "@/components/site/Reveal";
import { SlideShow } from "@/components/site/SlideShow";
import { AUDIENCE, CONTACT, FAQS, FEATURES, HERO, INQUIRY, NAV, SECTIONS, STEPS, pick } from "@/lib/site/content";
import type { PublicPlan } from "@/lib/site/plans";
import { sitePath } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

const Tick = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const section = "mx-auto w-full max-w-[1200px] px-[clamp(16px,4vw,40px)]";

/** Jamavat's home page — the Landing artboard, in whichever language the address asks for. */
export function SiteHome({ lang, plans }: { lang: Lang; plans: PublicPlan[] }) {
  return (
    <>
      <section className={`${section} flex flex-wrap items-center gap-10 py-[clamp(32px,6vw,72px)]`}>
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
          <Badge tone="orange" className="animate-fade-up self-start">
            {pick(HERO.eyebrow, lang)}
          </Badge>
          <h1 className="animate-fade-up text-[clamp(34px,5vw,56px)] font-extrabold leading-[1.08] tracking-[-0.03em] [animation-delay:70ms]">
            {pick(HERO.title, lang)}
          </h1>
          <p className="animate-fade-up max-w-[540px] text-lg leading-relaxed text-stone-700 [animation-delay:140ms]">{pick(HERO.body, lang)}</p>
          <div className="animate-fade-up flex flex-wrap gap-3 [animation-delay:210ms]">
            <a href="#demo" className={buttonClass({ size: "xl" })}>
              {pick(NAV.demo, lang)}
            </a>
            <a href="#how" className={buttonClass({ variant: "secondary", size: "xl" })}>
              {pick(NAV.seeHow, lang)}
            </a>
          </div>
          <ul className="animate-fade-up flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[15px] text-stone-700 [animation-delay:280ms]">
            {HERO.points.map((point) => (
              <li key={point.en} className="flex items-center gap-1.5">
                <Tick />
                {pick(point, lang)}
              </li>
            ))}
          </ul>
        </div>
        <SlideShow lang={lang} className="animate-fade-up [animation-delay:150ms]" />
      </section>

      <section aria-label={pick(AUDIENCE.label, lang)} className="border-y border-border bg-surface">
        <div className={`${section} flex flex-wrap items-center gap-x-3.5 gap-y-2.5 py-5`}>
          <span className="mr-1.5 text-sm font-bold text-stone-700">{pick(AUDIENCE.label, lang)}</span>
          {AUDIENCE.items.map((item) => (
            <span key={item.en} className="rounded-full bg-surface-muted px-3.5 py-2 text-sm font-semibold">
              {pick(item, lang)}
            </span>
          ))}
        </div>
      </section>

      <section id="features" className={`${section} flex scroll-mt-4 flex-col gap-7 py-[clamp(40px,6vw,80px)]`}>
        <Reveal className="flex max-w-[640px] flex-col gap-2">
          <h2 className="text-[clamp(26px,3.4vw,38px)] font-extrabold tracking-[-0.02em]">{pick(SECTIONS.featuresTitle, lang)}</h2>
          <p className="text-base leading-relaxed text-text-muted">{pick(SECTIONS.featuresBody, lang)}</p>
        </Reveal>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {FEATURES.map((feature, index) => (
            <Reveal
              key={feature.title.en}
              as="article"
              delay={(index % 3) * 90}
              className="flex flex-col gap-2.5 rounded-[20px] border border-border bg-surface p-[22px]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-[15px] font-extrabold text-brand">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-extrabold">{pick(feature.title, lang)}</h3>
              <p className="text-[15px] leading-relaxed text-text-muted">{pick(feature.body, lang)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-4 bg-stone-900 text-white">
        <div className={`${section} flex flex-col gap-7 py-[clamp(40px,6vw,80px)]`}>
          <Reveal as="h2" className="text-[clamp(26px,3.4vw,38px)] font-extrabold tracking-[-0.02em]">
            {pick(SECTIONS.howTitle, lang)}
          </Reveal>
          <ol className="grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {STEPS.map((step, index) => (
              <Reveal
                key={step.title.en}
                as="li"
                delay={index * 90}
                className="flex flex-col gap-2.5 rounded-[20px] border border-stone-700 bg-stone-800 p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-extrabold">{index + 1}</span>
                <h3 className="text-[19px] font-extrabold">{pick(step.title, lang)}</h3>
                <p className="text-[15px] leading-relaxed text-stone-300">{pick(step.body, lang)}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" className={`${section} flex scroll-mt-4 flex-col gap-7 py-[clamp(40px,6vw,80px)]`}>
        <Reveal className="flex max-w-[640px] flex-col gap-2">
          <h2 className="text-[clamp(26px,3.4vw,38px)] font-extrabold tracking-[-0.02em]">{pick(SECTIONS.pricingTitle, lang)}</h2>
          <p className="text-base leading-relaxed text-text-muted">{pick(SECTIONS.pricingBody, lang)}</p>
        </Reveal>
        <PricingPlans lang={lang} plans={plans} />
      </section>

      <section id="faq" className="bg-surface">
        <div className={`${section} flex max-w-[860px] scroll-mt-4 flex-col gap-5 py-[clamp(40px,6vw,80px)]`}>
          <h2 className="text-[clamp(26px,3.4vw,38px)] font-extrabold tracking-[-0.02em]">{pick(SECTIONS.faqTitle, lang)}</h2>
          <div className="flex flex-col gap-2.5">
            {FAQS.map((faq, index) => (
              <Reveal key={faq.q.en} delay={(index % 4) * 70}>
                <details open={index === 0} className="rounded-2xl border border-border bg-surface-muted px-5 py-1">
                  <summary className="py-4 text-[17px] font-bold">{pick(faq.q, lang)}</summary>
                  <p className="mb-[18px] text-[15px] leading-relaxed text-stone-700">{pick(faq.a, lang)}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="scroll-mt-4 border-t border-border bg-surface-muted">
        <div className={`${section} flex flex-wrap items-start gap-10 py-[clamp(40px,6vw,80px)]`}>
          <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
            <h2 className="text-[clamp(26px,3.4vw,38px)] font-extrabold tracking-[-0.02em]">{pick(INQUIRY.title, lang)}</h2>
            <p className="text-base leading-relaxed text-text-muted">{pick(INQUIRY.body, lang)}</p>
            <div className="flex flex-wrap gap-3">
              {CONTACT.whatsapp ? (
                <a
                  href={`https://wa.me/${CONTACT.whatsapp}`}
                  rel="noopener"
                  target="_blank"
                  className={buttonClass({ variant: "secondary", size: "lg" })}
                >
                  {pick(INQUIRY.whatsapp, lang)}
                </a>
              ) : null}
              {CONTACT.phone ? (
                <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className={buttonClass({ variant: "secondary", size: "lg" })}>
                  {CONTACT.phone}
                </a>
              ) : null}
              <a href={sitePath(lang, "/pricing")} className={buttonClass({ variant: "link", size: "lg" })}>
                {pick(NAV.pricing, lang)}
              </a>
            </div>
          </div>
          <div className="min-w-0 flex-[1_1_460px]">
            <InquiryForm lang={lang} />
          </div>
        </div>
      </section>
    </>
  );
}
