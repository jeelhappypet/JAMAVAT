import { buttonClass } from "@/components/ui/Button";
import { SiteIcon } from "@/components/site/SiteIcon";
import { CONTACT, INSTAGRAM_URL, SECTIONS, pick } from "@/lib/site/content";
import type { Lang } from "@/lib/i18n/messages";

/**
 * @jamavat.india, on the page rather than only in the footer. The link is
 * also in the Organization schema's `sameAs` (lib/site/jsonLd.ts): a search
 * engine that sees the account linked from the site and the site linked from
 * the account treats both as the same brand, which is what makes a search
 * for "jamavat" return this page rather than only the Instagram profile.
 */
export function InstagramBand({ lang }: { lang: Lang }) {
  return (
    <section className="border-y border-border bg-brand-light">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-5 px-[clamp(16px,4vw,40px)] py-[clamp(28px,4vw,44px)]">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-ink text-brand-strong">
            <SiteIcon name="instagram" size={24} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-[21px] font-extrabold tracking-[-0.01em]">{pick(SECTIONS.followTitle, lang)}</h2>
            <p className="max-w-[48ch] text-[15px] leading-relaxed text-text-muted">{pick(SECTIONS.followBody, lang)}</p>
          </div>
        </div>
        <a href={INSTAGRAM_URL} data-track="instagram" target="_blank" rel="me noopener" className={buttonClass({ variant: "dark", size: "md" })}>
          @{CONTACT.instagram}
        </a>
      </div>
    </section>
  );
}
