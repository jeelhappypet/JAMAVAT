"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { trackSiteEvent } from "@/components/site/SiteAnalytics";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextArea, TextField } from "@/components/ui/TextField";
import { CONTACT, INQUIRY, internationalPhone, pick } from "@/lib/site/content";
import type { Lang } from "@/lib/i18n/messages";

/** Campaign tags in the address, so HQ can tell which ad or post a lead came from. */
function utmOf(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const [key, value] of params) if (key.startsWith("utm_")) utm[key.slice(4)] = value.slice(0, 200);
  return Object.keys(utm).length ? utm : undefined;
}

/**
 * "Book a free demo" — the only thing the website asks a visitor to do.
 * Phone is the one field we really need; everything else makes the call
 * better but never blocks it.
 */
export function InquiryForm({ lang }: { lang: Lang }) {
  const f = INQUIRY.fields;
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, lang, source: window.location.pathname, utm: utmOf() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "");
      setSent(true);
      // The one conversion that matters, counted for HQ's Website tab. The
      // inquiry itself is already saved; this only moves a counter, so it is
      // never awaited and never allowed to fail the submit.
      trackSiteEvent("inquiry-sent", lang);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : pick(INQUIRY.body, lang));
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6">
        <Alert tone="success">{pick(INQUIRY.done, lang)}</Alert>
        {CONTACT.phone ? (
          <a className="text-[15px] font-bold text-brand underline" href={`tel:${internationalPhone(CONTACT.phone)}`}>
            {CONTACT.phone}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3.5 rounded-3xl border border-border bg-surface p-6 sm:grid-cols-2"
    >
      <TextField name="name" label={pick(f.name, lang)} autoComplete="name" required maxLength={60} />
      <TextField name="phone" label={pick(f.phone, lang)} type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} />
      <TextField name="restaurantName" label={pick(f.restaurant, lang)} autoComplete="organization" maxLength={80} />
      <TextField name="city" label={pick(f.city, lang)} autoComplete="address-level2" maxLength={60} />
      <Select name="tables" label={pick(f.tables, lang)} options={INQUIRY.tables.map((value) => ({ value, label: value }))} />
      <Select
        name="kitchens"
        label={pick(f.kitchens, lang)}
        options={INQUIRY.kitchens.map((option) => ({ value: option.en, label: pick(option, lang) }))}
      />
      <TextField name="email" label={pick(f.email, lang)} type="email" autoComplete="email" maxLength={120} className="sm:col-span-2" />
      <TextArea name="message" label={pick(f.message, lang)} rows={3} maxLength={1000} className="sm:col-span-2" />

      {/* Honeypot: off-screen and not focusable, so only a bot fills it in. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-px w-px opacity-0"
      />

      {error ? <Alert className="sm:col-span-2">{error}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <span className="max-w-[320px] text-[13px] text-text-muted">{pick(INQUIRY.privacy, lang)}</span>
        <Button type="submit" size="xl" disabled={sending}>
          {sending ? pick(INQUIRY.sending, lang) : pick(INQUIRY.submit, lang)}
        </Button>
      </div>
    </form>
  );
}
