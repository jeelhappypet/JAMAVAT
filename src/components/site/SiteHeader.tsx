"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { buttonClass } from "@/components/ui/Button";
import { NAV, SITE_NAME, pick } from "@/lib/site/content";
import { sitePath } from "@/lib/site/urls";
import type { Lang } from "@/lib/i18n/messages";

/**
 * The website's header. Sticky, because the demo button is the point of the
 * page and it used to be reachable only by scrolling back to the top.
 *
 * On a phone the links are behind a hamburger: laid out in a row they wrapped
 * onto three lines, and a sticky bar three lines tall eats a third of the
 * screen. The panel is plain markup toggled by one piece of state — no
 * library, no focus trap to get wrong, and `Escape` and a tap outside both
 * close it.
 */
export function SiteHeader({ lang, path = "/" }: { lang: Lang; path?: string }) {
  const other: Lang = lang === "gu" ? "en" : "gu";
  const anchor = (hash: string) => (path === "/" ? hash : `${sitePath(lang)}${hash}`);
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onPointer = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const links = [
    { href: anchor("#features"), label: pick(NAV.features, lang) },
    { href: anchor("#screens"), label: pick(NAV.how, lang) },
    { href: sitePath(lang, "/pricing"), label: pick(NAV.pricing, lang), internal: true },
    { href: anchor("#faq"), label: pick(NAV.faq, lang) },
  ];
  const link = "rounded-lg px-2 py-2 text-[14.5px] font-semibold text-text-muted transition-colors hover:text-brand";

  return (
    <header
      className={`site-header sticky top-0 z-30 border-b bg-surface/90 backdrop-blur-md ${
        condensed ? "border-border py-1.5 shadow-[0_6px_24px_-20px_rgba(42,22,17,0.9)]" : "border-transparent py-2.5"
      }`}
    >
      <div ref={panelRef} className="mx-auto w-full max-w-[1340px] px-[clamp(16px,3.5vw,44px)]">
        <div className="flex items-center justify-between gap-x-4">
          <Link href={sitePath(lang)} className="flex items-center gap-2.5" aria-label={SITE_NAME} onClick={() => setOpen(false)}>
            <BrandMark size={condensed ? 36 : 40} withName compactName />
          </Link>

          <nav aria-label={SITE_NAME} className="flex items-center gap-x-1">
            <span className="hidden items-center gap-x-1 md:flex">
              {links.map((item) =>
                item.internal ? (
                  <Link key={item.label} href={item.href} className={link}>
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.label} href={item.href} className={link}>
                    {item.label}
                  </a>
                )
              )}
            </span>

            <Link
              href={sitePath(other, path)}
              hrefLang={other}
              className="rounded-[9px] border border-border px-2.5 py-1.5 text-[13px] font-bold text-text-muted transition-colors hover:border-brand hover:text-brand"
            >
              {other === "gu" ? "ગુજરાતી" : "English"}
            </Link>

            {/* A full page load: the website is prerendered in English, and the login screen must pick up the staff's own language. */}
            <a href="/login" data-track="staff-login" className={`${link} hidden md:inline-block`}>
              {pick(NAV.staffLogin, lang)}
            </a>

            {/* Wrapped rather than given a `hidden` class: `buttonClass` already
                sets `inline-flex`, and two unprefixed display utilities on one
                element are settled by stylesheet order, not by which was asked
                for last. On a phone the hamburger holds this button anyway. */}
            <span className="ml-1 hidden sm:block">
              <a href={anchor("#demo")} data-track="demo-header" className={buttonClass({ size: "sm", className: "site-cta md:h-11 md:px-4 md:text-[14.5px]" })}>
                {pick(NAV.demo, lang)}
              </a>
            </span>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={pick(open ? NAV.closeMenu : NAV.openMenu, lang)}
              className="ml-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:border-brand hover:text-brand md:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </nav>
        </div>

        {open ? (
          <div id="site-menu" className="flex flex-col gap-1 border-t border-border pb-3 pt-3 md:hidden">
            {links.map((item) =>
              item.internal ? (
                <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-2 py-2.5 text-[15px] font-semibold">
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-2 py-2.5 text-[15px] font-semibold">
                  {item.label}
                </a>
              )
            )}
            <a href="/login" className="rounded-xl px-2 py-2.5 text-[15px] font-semibold">
              {pick(NAV.staffLogin, lang)}
            </a>
            <a href={anchor("#demo")} data-track="demo-header" onClick={() => setOpen(false)} className={buttonClass({ size: "md", fullWidth: true, className: "mt-1.5" })}>
              {pick(NAV.demo, lang)}
            </a>
          </div>
        ) : null}
      </div>
    </header>
  );
}
