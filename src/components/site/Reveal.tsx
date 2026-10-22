"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/** Which way a section enters. The CSS for each lives in globals.css. */
export type RevealFrom = "up" | "left" | "right" | "scale" | "wipe";

/**
 * Reveals a section as it scrolls into view. Content is in the HTML either
 * way — this only animates its entrance, and the <noscript> rule in
 * (site)/layout.tsx shows it immediately with no JS.
 *
 * One observer for the whole page rather than one per element: the home page
 * has ~30 of these, and 30 observers each with their own callback is work the
 * main thread does while someone is trying to scroll.
 */
let observer: IntersectionObserver | null = null;

function watch(el: Element) {
  if (typeof IntersectionObserver === "undefined") {
    el.classList.add("is-visible");
    return () => {};
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer?.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
  );
  observer.observe(el);
  return () => observer?.unobserve(el);
}

export function Reveal({
  children,
  as: Tag = "div",
  from = "up",
  className,
  delay = 0,
}: {
  children: ReactNode;
  as?: ElementType;
  from?: RevealFrom;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already past it on load (a deep link, or a restored scroll position):
    // show it at once rather than animating something the reader is looking at.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add("is-visible");
      return;
    }
    return watch(el);
  }, []);

  return (
    <Tag ref={ref} data-reveal={from} className={className} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}
