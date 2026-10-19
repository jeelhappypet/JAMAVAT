"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Fades a section up as it scrolls into view (globals.css `[data-reveal]`).
 * Content is in the HTML either way — this only animates its entrance, and
 * the <noscript> rule in (site)/layout.tsx shows it immediately with no JS.
 */
export function Reveal({ children, as: Tag = "div", className, delay = 0 }: { children: ReactNode; as?: ElementType; className?: string; delay?: number }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} data-reveal className={className} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}
