"use client";

import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { SLIDES, pick } from "@/lib/site/content";
import type { Lang } from "@/lib/i18n/messages";

/**
 * The hero carousel. The text of every slide is in the page's HTML from the
 * first render (only the display changes on a tap), so a search engine reads
 * all of it even though a visitor sees one at a time.
 *
 * The frames are placeholders until there are real screenshots to put in —
 * an invented screenshot would show a restaurant that doesn't exist.
 */
export function SlideShow({ lang }: { lang: Lang }) {
  const [current, setCurrent] = useState(0);
  const count = SLIDES.length;
  const move = (step: number) => setCurrent((index) => (index + step + count) % count);

  return (
    <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4 rounded-[28px] border border-border bg-surface p-5">
      <div className="flex h-[320px] items-center justify-center rounded-[20px] bg-surface-muted p-5">
        {SLIDES.map((slide, index) => (
          <div
            key={slide.title.en}
            hidden={index !== current}
            className={`flex flex-col items-center justify-center gap-2 border-8 border-stone-900 bg-surface p-3 text-center text-[13px] font-bold text-text-muted ${
              slide.shape === "phone" ? "h-[280px] w-[170px] rounded-[30px]" : "h-[250px] w-[380px] max-w-full rounded-[20px]"
            }`}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <path d="m21 16-5-5-9 9" />
            </svg>
            {pick(slide.tag, lang)}
          </div>
        ))}
      </div>

      <div className="flex min-h-[104px] flex-col gap-1.5">
        {SLIDES.map((slide, index) => (
          <div key={slide.title.en} hidden={index !== current} className="flex flex-col gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-brand-dark">{pick(slide.tag, lang)}</span>
            <h2 className="text-[22px] font-extrabold tracking-[-0.01em]">{pick(slide.title, lang)}</h2>
            <p className="text-[15px] leading-relaxed text-text-muted">{pick(slide.body, lang)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.title.en}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={pick(slide.title, lang)}
              aria-current={index === current}
              className="flex h-11 w-9 items-center justify-center"
            >
              <span className={`h-2.5 rounded-full ${index === current ? "w-7 bg-brand" : "w-2.5 bg-stone-400"}`} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 text-[13px] font-semibold text-text-muted">
            {current + 1} / {count}
          </span>
          <IconButton size="md" label={pick(SLIDES[(current - 1 + count) % count].title, lang)} onClick={() => move(-1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 6-6 6 6 6" />
            </svg>
          </IconButton>
          <IconButton size="md" label={pick(SLIDES[(current + 1) % count].title, lang)} onClick={() => move(1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </IconButton>
        </div>
      </div>
    </div>
  );
}
