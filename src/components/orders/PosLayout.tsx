"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

interface PosLayoutProps {
  /** The category rail. Vertical column on a laptop, sticky top strip on a phone. */
  rail: ReactNode;
  /** Search and filters, above the dish grid. */
  toolbar: ReactNode;
  /** The dish grid. The only thing that scrolls on a laptop. */
  children: ReactNode;
  /** The running bill. A right-hand column on a laptop, a bottom sheet on a phone. */
  cart: ReactNode;
  /** The one line the phone shows when the sheet is shut — "3 dishes · ₹560". */
  cartSummary: ReactNode;
  /** Label for the button that opens the sheet, and the one that shuts it. */
  openCartLabel: string;
  closeCartLabel: string;
  /** Hides the phone's summary bar while the bill is empty. */
  cartEmpty: boolean;
  /**
   * Receives the element the dishes scroll inside. `CategoryRail` needs the
   * real scrolling box to follow — a wrapper the screen puts around its own
   * grid is `display: contents` or not the scroller, and measures as nothing.
   */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * The shape of a till screen: categories, dishes and the bill all on screen at
 * once, each scrolling on its own, with the page itself never scrolling.
 *
 * That last part is the point. `/new-order` used to be one long document with
 * the bill floating at the top of it, so taking an order for the fourth
 * category meant scrolling the bill off the screen — and then scrolling back
 * to check it. Petpooja sells its till as "a single screen" for this reason.
 *
 * A phone cannot hold three panes, so there the bill becomes a bottom sheet
 * over the dishes with a summary bar always visible. The dishes stay the full
 * width; nothing is hidden behind a menu.
 */
export function PosLayout({ rail, toolbar, children, cart, cartSummary, openCartLabel, closeCartLabel, cartEmpty, scrollRef }: PosLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const height = usePaneHeight(rootRef);
  const wide = useIsWide();

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  return (
    // Two things keep the panes inside the window, and both are easy to undo
    // by accident:
    //
    // - `min-h-0` all the way down. A flex child defaults to min-height:auto
    //   and refuses to shrink below its content, so the inner panes never get
    //   a scrollbar and the page grows instead.
    // - no `flex-1` on this element. `flex: 1 1 0%` makes flex layout decide
    //   the height and the measured `style.height` is then ignored — which is
    //   exactly what happened the first time this was built.
    <div ref={rootRef} style={height} className="flex min-h-0 shrink-0 flex-col gap-3 lg:flex-row lg:gap-4">
      {/* -------------------------------------------------------- categories */}
      <div className="shrink-0 lg:w-[186px] lg:min-h-0 lg:overflow-y-auto lg:pb-2">{rail}</div>

      {/* ------------------------------------------------------- dishes */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {toolbar}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-28 lg:pb-2">{children}</div>
      </div>

      {/* ---------------------------------------------------------- the bill */}
      {/* Rendered into one place or the other, never both. Hiding the second
          copy with `lg:hidden` left every control in the bill twice in the
          DOM at every width — two "Swipe to send", two of each stepper — which
          a screen reader reads out twice and which mounts the swipe control's
          pointer handlers twice. */}
      {wide ? <div className="flex w-[332px] shrink-0 flex-col xl:w-[368px]">{cart}</div> : null}

      {/* The same bill on a phone: a bar that is always there, and a sheet. */}
      {!wide && (!cartEmpty || sheetOpen) ? (
        <div className="fixed inset-x-0 bottom-0 z-30">
          {sheetOpen ? (
            <>
              {/* The backdrop is not a button. As one it was a second control
                  called "Close" next to the real one, which a screen reader
                  reads out twice and a test cannot tell apart. Tapping it
                  still shuts the sheet, and so does Escape via the dialog. */}
              <div aria-hidden onClick={() => setSheetOpen(false)} className="fixed inset-0 -z-10 bg-ink/45 motion-safe:animate-[fade-in_0.2s_ease-out]" />
              <div className="max-h-[78dvh] overflow-hidden rounded-t-[22px] border-t border-border bg-surface shadow-[0_-18px_40px_-24px_rgba(42,22,17,0.6)] motion-safe:animate-[sheet-up_0.28s_cubic-bezier(0.16,1,0.3,1)]">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                  <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
                  <button type="button" onClick={() => setSheetOpen(false)} className="text-sm font-bold text-brand">
                    {closeCartLabel}
                  </button>
                </div>
                <div className="max-h-[calc(78dvh-46px)] overflow-y-auto">{cart}</div>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className={cn(
                "flex w-full items-center justify-between gap-3 border-t border-border bg-ink px-4 py-3 text-left text-white",
                "motion-safe:animate-[sheet-up_0.3s_cubic-bezier(0.16,1,0.3,1)]"
              )}
            >
              {cartSummary}
              <span className="shrink-0 rounded-[10px] bg-brand-strong px-3 py-1.5 text-sm font-extrabold text-ink">{openCartLabel}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The height that makes the panes scroll instead of the page: whatever is
 * left of the window below wherever this layout starts.
 *
 * Measured rather than written as `calc(100dvh - something)` because the
 * staff header above it is not one height — the admin's has a second row of
 * tabs and the counter's does not, and both wrap at narrow widths. A hard
 * number would be wrong on one of them, and wrong by a different amount on a
 * phone in landscape.
 *
 * Returns nothing until it has measured, so the first paint is ordinary flow
 * and the page is never left with a height of zero if this does not run.
 */
function usePaneHeight(ref: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const top = element.getBoundingClientRect().top;
      // Everything the ancestors reserve below this element. The shell's
      // <main> has 48px of bottom padding two levels up, and without counting
      // it the panes end up 48px taller than the window — so the page scrolls
      // after all, which is the one thing this is here to stop.
      let below = 0;
      for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        below += (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderBottomWidth) || 0) + (parseFloat(style.marginBottom) || 0);
      }
      // A floor so a very short window (a phone with the keyboard open over
      // it) cannot collapse the panes to nothing.
      setHeight(Math.max(360, window.innerHeight - top - below));
    };

    measure();
    window.addEventListener("resize", measure);
    // The header reflows when the restaurant name wraps or a tab row appears.
    const observer = new ResizeObserver(measure);
    if (element.parentElement) observer.observe(element.parentElement);
    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [ref]);

  return height === null ? undefined : { height };
}

/**
 * Whether there is room for the bill beside the dishes (Tailwind's `lg`).
 *
 * Read with `matchMedia` rather than left to CSS because the bill has to be
 * rendered in one place or the other, not in both with one hidden — see the
 * note where it is used. Safe to read during the first render: this layout is
 * only ever reached after the menu has loaded on the client, so it never runs
 * on the server.
 */
function useIsWide() {
  const query = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => (typeof window === "undefined" ? true : window.matchMedia(query).matches));

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setWide(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return wide;
}
