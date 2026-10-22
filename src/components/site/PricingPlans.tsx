import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tick } from "@/components/site/SiteIcon";
import { NAV, SECTIONS, pick } from "@/lib/site/content";
import type { PublicPlan } from "@/lib/site/plans";
import type { Lang } from "@/lib/i18n/messages";

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * The plans HQ has marked public. With none set up yet the section says so
 * and points at the demo form — never a made-up price.
 */
export function PricingPlans({ lang, plans }: { lang: Lang; plans: PublicPlan[] }) {
  if (plans.length === 0) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-base text-text-muted">{pick(SECTIONS.pricingAsk, lang)}</p>
        <a href="#demo" data-track="plan-demo" className={buttonClass({ size: "md" })}>
          {pick(NAV.demo, lang)}
        </a>
      </Card>
    );
  }

  return (
    // A lone plan stretched the full 1120px and read as a banner rather than a
    // price card, so one plan is capped at a card's width.
    <div className={`grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] ${plans.length === 1 ? "max-w-[420px]" : ""}`}>
      {plans.map((plan) => (
        <Card key={plan.id} className={`flex flex-col gap-4 p-6 ${plan.isPopular ? "border-2 border-brand" : ""}`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xl font-extrabold">{pick(plan.name, lang)}</h3>
            {plan.isPopular ? <Badge tone="orange">{pick(SECTIONS.popular, lang)}</Badge> : null}
          </div>
          {pick(plan.description, lang) ? <p className="text-[15px] leading-relaxed text-text-muted">{pick(plan.description, lang)}</p> : null}

          <p className="flex items-baseline gap-1.5">
            {plan.priceMonthly > 0 ? (
              <>
                <span className="text-[34px] font-extrabold tracking-tight">{rupees(plan.priceMonthly)}</span>
                <span className="text-sm font-semibold text-text-muted">{pick(SECTIONS.perMonth, lang)}</span>
              </>
            ) : (
              <span className="text-2xl font-extrabold tracking-tight">{pick(SECTIONS.talkToUs, lang)}</span>
            )}
          </p>
          {plan.priceYearly > 0 ? (
            <p className="-mt-2 text-sm text-text-muted">
              {rupees(plan.priceYearly)} {pick(SECTIONS.perYear, lang)}
            </p>
          ) : null}

          {plan.highlights.length > 0 ? (
            <ul className="flex list-none flex-col gap-2 p-0 text-[15px] text-text-muted">
              {plan.highlights.map((highlight) => (
                <li key={highlight.en} className="flex items-start gap-2">
                  <Tick size={16} className="mt-1" />
                  {pick(highlight, lang)}
                </li>
              ))}
            </ul>
          ) : null}

          <a href="#demo" data-track="plan-demo" className={buttonClass({ variant: plan.isPopular ? "primary" : "secondary", size: "md", className: "mt-auto" })}>
            {pick(NAV.demo, lang)}
          </a>
        </Card>
      ))}
    </div>
  );
}
