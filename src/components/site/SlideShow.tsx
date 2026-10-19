"use client";

import { useState } from "react";
import Image from "next/image";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";
import { SLIDES, pick } from "@/lib/site/content";
import type { Lang } from "@/lib/i18n/messages";

/**
 * The hero carousel. The text of every slide is in the page's HTML from the
 * first render (only the display changes on a tap), so a search engine reads
 * all of it even though a visitor sees one at a time.
 *
 * Each frame shows a real screenshot of the seeded "Jamavat Demo" restaurant
 * (see SLIDES in lib/site/content.ts) — never an invented one, which would
 * show a restaurant that doesn't exist.
 */
export function SlideShow({ lang, className }: { lang: Lang; className?: string }) {
  const [current, setCurrent] = useState(0);
  const count = SLIDES.length;
  const move = (step: number) => setCurrent((index) => (index + step + count) % count);

  return (
    <div className={cn("flex min-w-0 flex-[1_1_440px] flex-col gap-4 rounded-[28px] border border-border bg-surface p-5", className)}>
      <div className="flex h-[380px] items-center justify-center rounded-[20px] bg-surface-muted p-4">
        {SLIDES.map((slide, index) => (
          <div
            key={slide.title.en}
            hidden={index !== current}
            className={`relative overflow-hidden border-8 border-stone-900 bg-surface shadow-lg ${
              slide.shape === "phone" ? "h-[348px] w-[214px] rounded-[36px]" : "h-[310px] w-[480px] max-w-full rounded-[22px]"
            }`}
          >
            <Image src={slide.image} alt={pick(slide.title, lang)} fill sizes="(min-width: 640px) 480px, 90vw" className="object-cover object-top" priority={index === 0} />
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
