import { Badge } from "@/components/ui/Badge";
import { DeviceFrame } from "@/components/site/DeviceFrame";
import { Reveal } from "@/components/site/Reveal";
import { Tick } from "@/components/site/SiteIcon";
import { SLIDES, pick } from "@/lib/site/content";
import type { Lang } from "@/lib/i18n/messages";

/**
 * The four screens, one per row, alternating sides. This replaced a 380px
 * carousel that showed one small screenshot at a time behind a next arrow —
 * the four screens *are* the product, and a visitor who has to click to see
 * the second one mostly doesn't.
 *
 * Every frame is in the HTML, so a search engine (and a printout, and a
 * phone with JavaScript off) gets all four.
 */
export function Showcase({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col gap-[clamp(36px,5vw,68px)]">
      {SLIDES.map((slide, index) => {
        const flipped = index % 2 === 1;
        return (
          <article key={slide.title.en} className={`flex flex-wrap items-center gap-x-[clamp(28px,4.5vw,64px)] gap-y-6 ${flipped ? "flex-row-reverse" : ""}`}>
            {/* The words and the picture come in from opposite sides, so a row
                reads as one movement rather than two things fading in. */}
            <Reveal from={flipped ? "right" : "left"} className="flex min-w-0 flex-[1_1_300px] flex-col items-start gap-3">
              <Badge tone="orange">{pick(slide.tag, lang)}</Badge>
              <h3 className="heading t-h2">{pick(slide.title, lang)}</h3>
              <p className="t-lead text-text-muted">{pick(slide.body, lang)}</p>
              <ul className="mt-0.5 flex list-none flex-col gap-1.5 p-0">
                {slide.points.map((point) => (
                  <li key={point.en} className="t-body flex items-start gap-2 font-semibold">
                    <Tick size={16} className="mt-1" />
                    {pick(point, lang)}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal from="wipe" delay={80} className={`flex min-w-0 flex-[1_1_380px] ${slide.shape === "phone" ? "justify-center" : ""}`}>
              <DeviceFrame
                src={slide.image}
                alt={pick(slide.title, lang)}
                shape={slide.shape}
                sizes={slide.shape === "phone" ? "260px" : "(min-width: 1180px) 600px, (min-width: 700px) 50vw, 90vw"}
              />
            </Reveal>
          </article>
        );
      })}
    </div>
  );
}
