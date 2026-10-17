import { InquiryForm } from "@/components/site/InquiryForm";
import { PricingPlans } from "@/components/site/PricingPlans";
import { FAQS, INQUIRY, SECTIONS, pick } from "@/lib/site/content";
import type { PublicPlan } from "@/lib/site/plans";
import type { Lang } from "@/lib/i18n/messages";

/** The pricing page: the public plans, what a subscription includes, and the demo form. */
export function PricingPageView({ lang, plans }: { lang: Lang; plans: PublicPlan[] }) {
  const costFaq = FAQS[FAQS.length - 1];
  return (
    <div className="mx-auto w-full max-w-[1000px] px-[clamp(16px,4vw,40px)] py-[clamp(32px,6vw,72px)]">
      <h1 className="text-[clamp(30px,4.4vw,46px)] font-extrabold leading-[1.1] tracking-[-0.02em]">{pick(SECTIONS.pricingTitle, lang)}</h1>
      <p className="mt-4 max-w-[640px] text-lg leading-relaxed text-stone-700">{pick(SECTIONS.pricingBody, lang)}</p>

      <div className="mt-8">
        <PricingPlans lang={lang} plans={plans} />
      </div>

      <section className="mt-10 flex flex-col gap-2.5">
        <h2 className="text-2xl font-extrabold tracking-[-0.01em]">{pick(costFaq.q, lang)}</h2>
        <p className="text-base leading-relaxed text-stone-700">{pick(costFaq.a, lang)}</p>
      </section>

      <section id="demo" className="mt-12 flex scroll-mt-4 flex-col gap-4">
        <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">{pick(INQUIRY.title, lang)}</h2>
        <p className="text-base leading-relaxed text-text-muted">{pick(INQUIRY.body, lang)}</p>
        <InquiryForm lang={lang} />
      </section>
    </div>
  );
}
