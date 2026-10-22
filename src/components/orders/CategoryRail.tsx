"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

export interface RailSection {
  id: string;
  label: string;
  /** The menu this category belongs to ("Gujarati") — the rail groups by it. */
  group?: string;
  count: number;
}

interface CategoryRailProps {
  sections: RailSection[];
  /** Id of the scroll container the sections live in. */
  scrollRef: React.RefObject<HTMLElement | null>;
  label: string;
  className?: string;
}

/**
 * Jumping between categories on the till. A vertical list on a laptop, a
 * horizontal strip on a phone.
 *
 * It follows the dish grid rather than driving it: the grid is one scrolling
 * list of every category, and this highlights whichever heading is at the top
 * of it. Tabs that swap the list out would mean a counter hand hunting for
 * which tab a dish is under; one list can also be searched in one pass.
 *
 * No router, no hash: a `#category` in the address bar would be restored on
 * reload and scroll a till screen somewhere nobody asked for.
 */
export function CategoryRail({ sections, scrollRef, label, className }: CategoryRailProps) {
  const [current, setCurrent] = useState<string | null>(sections[0]?.id ?? null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || sections.length === 0) return;

    // Whichever heading is nearest the top of the grid without being past it.
    const onScroll = () => {
      const top = root.getBoundingClientRect().top;
      let best: string | null = sections[0].id;
      for (const section of sections) {
        const element = document.getElementById(`pos-section-${section.id}`);
        if (!element) continue;
        if (element.getBoundingClientRect().top - top <= 12) best = section.id;
      }
      setCurrent(best);
    };

    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [scrollRef, sections]);

  // Keep the active chip in view on a phone, where the rail scrolls sideways.
  useEffect(() => {
    if (!current) return;
    railRef.current
      ?.querySelector(`[data-rail-id="${CSS.escape(current)}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [current]);

  if (sections.length === 0) return null;

  const jump = (id: string) => {
    const element = document.getElementById(`pos-section-${id}`);
    const root = scrollRef.current;
    if (!element || !root) return;
    root.scrollTo({ top: root.scrollTop + element.getBoundingClientRect().top - root.getBoundingClientRect().top - 8, behavior: "smooth" });
  };

  // Worked out up front rather than with a running variable inside the map:
  // mutating during render is a lint error here, and rightly so.
  const startsGroup = sections.map((section, index) => Boolean(section.group) && section.group !== sections[index - 1]?.group);

  return (
    <nav
      ref={railRef}
      aria-label={label}
      className={cn(
        "no-scrollbar flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-x-visible",
        className
      )}
    >
      {sections.map((section, index) => {
        const newGroup = startsGroup[index];
        const on = section.id === current;
        return (
          <span key={section.id} className="contents">
            {newGroup ? (
              <span className="hidden shrink-0 px-2.5 pb-1 pt-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-text-muted first:pt-0 lg:block">
                {section.group}
              </span>
            ) : null}
            <button
              type="button"
              data-rail-id={section.id}
              onClick={() => jump(section.id)}
              aria-current={on ? "true" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 py-2 text-left text-sm transition-colors lg:w-full",
                on ? "bg-brand font-extrabold text-white" : "font-semibold text-text-muted hover:bg-surface-muted"
              )}
            >
              <span className="min-w-0 truncate">{section.label}</span>
              <span className={cn("ml-auto text-xs font-bold tabular-nums", on ? "text-white/70" : "text-text-muted/70")}>{section.count}</span>
            </button>
          </span>
        );
      })}
    </nav>
  );
}
