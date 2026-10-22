import { DeviceFrame } from "@/components/site/DeviceFrame";
import { pick } from "@/lib/site/content";
import type { Localized } from "@/types";
import type { Lang } from "@/lib/i18n/messages";

/**
 * The hero picture: the counter screen with the guest's phone in front of it
 * — the two halves of Jamavat in one glance, which is the thing the headline
 * is claiming. Both are real screenshots of the seeded demo restaurant.
 *
 * On a phone the wide counter screen would be 358px across and nothing on it
 * legible, so it drops out below `sm` and the guest's phone stands alone at a
 * readable size. The counter screen is the first row of the showcase section
 * further down, so a phone reader still gets it — bigger, and in context.
 */
export function HeroArt({ lang, screenAlt, phoneAlt }: { lang: Lang; screenAlt: Localized; phoneAlt: Localized }) {
  return (
    <div className="relative mx-auto flex w-full max-w-[620px] justify-center sm:block sm:aspect-[1180/880]">
      <div className="hidden sm:absolute sm:right-0 sm:top-0 sm:block sm:w-[88%]">
        <DeviceFrame
          src="/site/hero-counter.png"
          alt={pick(screenAlt, lang)}
          shape="screen"
          priority
          sizes="(min-width: 1100px) 546px, 50vw"
        />
      </div>
      <div className="animate-drift w-[244px] max-w-[62%] sm:absolute sm:bottom-0 sm:left-0 sm:w-[30%] sm:max-w-none">
        <DeviceFrame
          src="/site/hero-guest-menu.png"
          alt={pick(phoneAlt, lang)}
          shape="phone"
          sizing="fill"
          priority
          sizes="(min-width: 1100px) 186px, (min-width: 640px) 28vw, 248px"
        />
      </div>
    </div>
  );
}
