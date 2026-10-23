import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { HeroArt } from "@/components/site/HeroArt";
import { InquiryForm } from "@/components/site/InquiryForm";
import { InstagramBand } from "@/components/site/InstagramBand";
import { PricingPlans } from "@/components/site/PricingPlans";
import { Reveal } from "@/components/site/Reveal";
import { Showcase } from "@/components/site/Showcase";
import { Arrow, FeatureIconTile, SiteIcon, Tick } from "@/components/site/SiteIcon";
import { AUDIENCE, CONTACT, FAQS, FEATURES, HERO, INQUIRY, NAV, PROOF, SECTIONS, STEPS, internationalPhone, pick } from "@/lib/site/content";
import type { PublicPlan } from "@/lib/site/plans";
import { sitePath } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

/** 1340px, not 1200: on a 1440 laptop the old width left a dead margin down both sides. */
const section = "mx-auto w-full max-w-[1340px] px-[clamp(16px,3.5vw,44px)]";
const band = "py-[clamp(40px,5vw,76px)]";

/** Jamavat's home page: hero, what it does, the four real screens, how to start, price, questions, demo. */
export function SiteHome({ lang, plans }: { lang: Lang; plans: PublicPlan[] }) {
  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="site-warm border-b border-border">
        <div className={`${section} flex flex-wrap items-center gap-x-12 gap-y-10 py-[clamp(32px,5vw,72px)]`}>
          <div className="flex min-w-0 flex-[1_1_430px] flex-col gap-4">
            <Badge tone="orange" className="animate-fade-up self-start">
              {pick(HERO.eyebrow, lang)}
            </Badge>
            <h1 className="heading t-hero animate-fade-up [animation-delay:70ms]">
              <span className="block text-brand">{pick(HERO.brand, lang)}</span>
              {pick(HERO.title, lang)}
            </h1>
            <p className="t-lead animate-fade-up max-w-[52ch] text-text-muted [animation-delay:140ms]">{pick(HERO.body, lang)}</p>
            {/* Side by side from the smallest screen: stacked, the two buttons
                pushed the hero picture a whole thumb-scroll down the page. */}
            <div className="animate-fade-up flex flex-row flex-wrap gap-2.5 [animation-delay:210ms]">
              <a href="#demo" data-track="demo" className={buttonClass({ size: "md", className: "site-cta sm:h-12 sm:px-[18px] sm:text-[15px]" })}>
                {pick(NAV.demo, lang)}
                <Arrow />
              </a>
              <a href="#screens" data-track="see-how" className={buttonClass({ variant: "secondary", size: "md", className: "sm:h-12 sm:px-[18px] sm:text-[15px]" })}>
                {pick(NAV.seeHow, lang)}
              </a>
            </div>
            <ul className="animate-fade-up t-small flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 font-semibold [animation-delay:280ms]">
              {HERO.points.map((point) => (
                <li key={point.en} className="flex items-center gap-1.5">
                  <Tick size={15} />
                  {pick(point, lang)}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-art-in min-w-0 flex-[1_1_420px] [animation-delay:180ms]">
            <HeroArt lang={lang} screenAlt={HERO.artScreenAlt} phoneAlt={HERO.artPhoneAlt} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- facts, then audience */}
      <section className="site-ink border-b border-border text-white">
        <dl className={`${section} grid list-none gap-x-8 gap-y-6 py-[clamp(24px,3vw,38px)] [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]`}>
          {PROOF.map((fact, index) => (
            <Reveal key={fact.label.en} from="up" delay={index * 70} className="flex flex-col gap-0.5">
              <dt className="heading text-[clamp(26px,2.9vw,34px)] leading-none text-brand-strong">{pick(fact.value, lang)}</dt>
              <dd className="t-small text-white/70">{pick(fact.label, lang)}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      <section aria-label={pick(AUDIENCE.label, lang)} className="border-b border-border bg-surface">
        {/* The label on its own line below `sm`. Inline, it pushed the first
            chip into the middle of the row and left the rest wrapping around
            a hole — one side full, the other side a gap. */}
        <div className={`${section} flex flex-col gap-2 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2.5`}>
          <span className="t-eyebrow text-text-muted sm:mr-1.5">{pick(AUDIENCE.label, lang)}</span>
          <ul className="flex list-none flex-wrap gap-1.5 p-0 sm:contents">
            {AUDIENCE.items.map((item) => (
              <li key={item.en} className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-[13px] font-semibold">
                {pick(item, lang)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ features */}
      <section id="features" className={`${section} ${band} flex scroll-mt-20 flex-col gap-8`}>
        <Reveal className="flex max-w-[640px] flex-col gap-2.5">
          <span className="t-eyebrow text-brand">{pick(NAV.features, lang)}</span>
          <h2 className="heading t-h2">{pick(SECTIONS.featuresTitle, lang)}</h2>
          <p className="t-lead text-text-muted">{pick(SECTIONS.featuresBody, lang)}</p>
        </Reveal>
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {FEATURES.map((feature, index) => (
            <Reveal
              key={feature.title.en}
              as="article"
              from="up"
              delay={(index % 4) * 70}
              className="site-lift flex flex-col gap-2.5 rounded-[18px] border border-border bg-surface p-5"
            >
              <FeatureIconTile name={feature.icon} />
              <h3 className="heading t-h3">{pick(feature.title, lang)}</h3>
              <p className="t-body text-text-muted">{pick(feature.body, lang)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- the four real screens */}
      <section id="screens" className="scroll-mt-20 border-y border-border bg-surface">
        <div className={`${section} ${band} flex flex-col gap-[clamp(32px,4.5vw,60px)]`}>
          <Reveal className="flex max-w-[640px] flex-col gap-2.5">
            <span className="t-eyebrow text-brand">{pick(SECTIONS.showcaseEyebrow, lang)}</span>
            <h2 className="heading t-h2">{pick(SECTIONS.showcaseTitle, lang)}</h2>
            <p className="t-lead text-text-muted">{pick(SECTIONS.showcaseBody, lang)}</p>
          </Reveal>
          <Showcase lang={lang} />
        </div>
      </section>

      {/* ----------------------------------------------------------- three steps */}
      <section id="how" className="site-ink scroll-mt-20 text-white">
        <div className={`${section} ${band} flex flex-col gap-8`}>
          <Reveal className="flex max-w-[640px] flex-col gap-2.5">
            <span className="t-eyebrow text-brand-strong">{pick(NAV.how, lang)}</span>
            <h2 className="heading t-h2">{pick(SECTIONS.howTitle, lang)}</h2>
            <p className="t-lead text-white/70">{pick(SECTIONS.howBody, lang)}</p>
          </Reveal>
          <ol className="grid list-none gap-3.5 p-0 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {STEPS.map((step, index) => (
              <Reveal key={step.title.en} as="li" from="up" delay={index * 90} className="flex flex-col gap-2.5 rounded-[18px] border border-white/12 bg-white/6 p-5">
                <span className="heading flex h-10 w-10 items-center justify-center rounded-xl bg-brand-strong text-base text-ink">{index + 1}</span>
                <h3 className="heading t-h3">{pick(step.title, lang)}</h3>
                <p className="t-body text-white/70">{pick(step.body, lang)}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------------------- pricing */}
      <section id="pricing" className={`${section} ${band} flex scroll-mt-20 flex-col gap-7`}>
        <Reveal className="flex max-w-[640px] flex-col gap-2.5">
          <span className="t-eyebrow text-brand">{pick(NAV.pricing, lang)}</span>
          <h2 className="heading t-h2">{pick(SECTIONS.pricingTitle, lang)}</h2>
          <p className="t-lead text-text-muted">{pick(SECTIONS.pricingBody, lang)}</p>
        </Reveal>
        <Reveal from="scale">
          <PricingPlans lang={lang} plans={plans} />
        </Reveal>
      </section>

      <InstagramBand lang={lang} />

      {/* ------------------------------------------------------------------ FAQ */}
      <section id="faq" className="border-y border-border bg-surface">
        <div className={`${section} ${band} flex max-w-[880px] scroll-mt-20 flex-col gap-6`}>
          <div className="flex flex-col gap-2.5">
            <span className="t-eyebrow text-brand">{pick(NAV.faq, lang)}</span>
            <h2 className="heading t-h2">{pick(SECTIONS.faqTitle, lang)}</h2>
          </div>
          <div className="flex flex-col gap-2">
            {FAQS.map((faq, index) => (
              <Reveal key={faq.q.en} from="up" delay={(index % 5) * 50}>
                <details open={index === 0} className="group rounded-[14px] border border-border bg-surface-muted px-4 open:border-brand/35 open:bg-brand-light/45">
                  <summary className="flex list-none items-center justify-between gap-4 py-3.5 text-[15.5px] font-bold [&::-webkit-details-marker]:hidden">
                    {pick(faq.q, lang)}
                    <span className="shrink-0 text-brand transition-transform duration-300 group-open:rotate-45" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <div className="site-answer">
                    <div>
                      <p className="t-body max-w-[70ch] pb-4 text-text-muted">{pick(faq.a, lang)}</p>
                    </div>
                  </div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- demo */}
      <section id="demo" className="site-warm scroll-mt-20">
        <div className={`${section} ${band} flex flex-wrap items-start gap-x-12 gap-y-8`}>
          <Reveal from="left" className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
            <h2 className="heading t-h2">{pick(INQUIRY.title, lang)}</h2>
            <p className="t-lead text-text-muted">{pick(INQUIRY.body, lang)}</p>
            <div className="mt-1 flex flex-wrap gap-2.5">
              {CONTACT.whatsapp ? (
                <a href={`https://wa.me/${CONTACT.whatsapp}`} data-track="whatsapp" rel="noopener" target="_blank" className={buttonClass({ variant: "secondary", size: "md" })}>
                  <SiteIcon name="whatsapp" size={17} />
                  {pick(INQUIRY.whatsapp, lang)}
                </a>
              ) : null}
              {CONTACT.phone ? (
                <a href={`tel:${internationalPhone(CONTACT.phone)}`} data-track="phone" className={buttonClass({ variant: "secondary", size: "md" })}>
                  <SiteIcon name="phone" size={17} />
                  {CONTACT.phone}
                </a>
              ) : null}
              <a href={sitePath(lang, "/pricing")} data-track="pricing" className={buttonClass({ variant: "link", size: "md" })}>
                {pick(NAV.pricing, lang)}
              </a>
            </div>
          </Reveal>
          <Reveal from="right" className="min-w-0 flex-[1_1_440px]">
            <InquiryForm lang={lang} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
