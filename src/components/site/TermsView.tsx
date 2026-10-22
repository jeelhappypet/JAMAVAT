import { CONTACT, pick } from "@/lib/site/content";
import { TERMS_INTRO, TERMS_SECTIONS, TERMS_TITLE, TERMS_UPDATED } from "@/lib/site/terms";
import type { Lang } from "@/lib/i18n/messages";

export function TermsView({ lang }: { lang: Lang }) {
  return (
    <article className="mx-auto w-full max-w-[760px] px-[clamp(16px,4vw,40px)] py-[clamp(32px,6vw,64px)]">
      <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-[-0.02em]">{pick(TERMS_TITLE, lang)}</h1>
      <p className="mt-1 text-sm text-text-muted">{TERMS_UPDATED}</p>
      <p className="mt-5 text-base leading-relaxed text-text-muted">{pick(TERMS_INTRO, lang)}</p>

      {TERMS_SECTIONS.map((section) => (
        <section key={section.heading.en} className="mt-7 flex flex-col gap-2">
          <h2 className="text-xl font-extrabold">{pick(section.heading, lang)}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph.en} className="text-[15px] leading-relaxed text-text-muted">
              {pick(paragraph, lang)}
            </p>
          ))}
        </section>
      ))}

      {CONTACT.email ? (
        <p className="mt-7 text-[15px] text-text-muted">
          <a className="font-bold text-brand underline" href={`mailto:${CONTACT.email}`}>
            {CONTACT.email}
          </a>
        </p>
      ) : null}
    </article>
  );
}
