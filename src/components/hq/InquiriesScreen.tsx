"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { DateInput, TextArea, TextField } from "@/components/ui/TextField";
import { formatDate } from "@/components/hq/bits";
import type { InquiryDTO, InquiryStatus } from "@/types";

const FILTERS: { value: string; label: string }[] = [
  { value: "DUE", label: "Due" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
  { value: "ALL", label: "All" },
];

const TONE: Record<InquiryStatus, "orange" | "stone" | "green" | "red"> = {
  NEW: "orange",
  CONTACTED: "stone",
  CONVERTED: "green",
  LOST: "red",
};

/** Today, in Surat — what a date field and a "due" list are both measured against. */
function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/**
 * The first WhatsApp message, in ગુજરાતી, because that is what the person
 * reading it speaks. It opens WhatsApp with the text filled in — HQ reads it,
 * edits it if they want and presses send themselves. Nothing is ever sent
 * from here on its own.
 */
function whatsappLink(inquiry: InquiryDTO, site: string): string {
  const who = inquiry.restaurantName ? ` ${inquiry.restaurantName}` : "";
  const text = [
    `નમસ્તે${who} 🙏`,
    "",
    "હું જમાવટમાંથી. તમારી રેસ્ટોરન્ટ માટે QR મેનુ: ગ્રાહક ટેબલ પરથી જ ઓર્ડર આપે, ઓર્ડર સીધો કિચનમાં જાય, અને જમ્યા પછી બિલ કાઉન્ટર પર તૈયાર — વેઇટરને વારંવાર બોલાવવાની જરૂર નહીં.",
    "",
    `એપ ડાઉનલોડ કરવાની જરૂર નથી, English + ગુજરાતી બંનેમાં ચાલે છે. 10 મિનિટનો ડેમો બતાવું? ${site}`,
  ].join("\n");
  return `https://wa.me/91${inquiry.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(text)}`;
}

const EMPTY_LEAD = { restaurantName: "", phone: "", city: "", tables: "", notes: "", followUpAt: "" };

/** The demo requests from the website, the leads HQ added itself, and what happened to each. */
export function InquiriesScreen() {
  const [filter, setFilter] = useState("DUE");
  const [adding, setAdding] = useState(false);
  const [lead, setLead] = useState(EMPTY_LEAD);
  const [saving, setSaving] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hq/inquiries?status=${filter}`);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (res.status === 401) return window.location.assign("/hq/login");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't load the inquiries");
      setInquiries(data.inquiries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the inquiries");
      setInquiries([]);
    }
  }, [filter]);

  // The filter changed: the old list stays on screen until the new one lands,
  // rather than flashing skeletons between two sets of leads.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, [load]);

  /** HQ's own browser origin is Jamavat's website, so the pitch links to it. */
  const site = typeof window === "undefined" ? "" : window.location.origin;

  async function addLead(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/hq/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't save that lead");
      setLead(EMPTY_LEAD);
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that lead");
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/hq/inquiries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return setError(data?.error ?? "Couldn't save that");
    setInquiries((current) => (current ?? []).map((inquiry) => (inquiry.id === id ? data.inquiry : inquiry)));
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">Leads</h1>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl label="Filter leads" value={filter} onChange={setFilter} options={FILTERS} />
          <Button variant={adding ? "secondary" : "primary"} size="md" onClick={() => setAdding((on) => !on)}>
            {adding ? "Cancel" : "Add a lead"}
          </Button>
        </div>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {adding ? (
        <Card>
          {/* A restaurant someone walked into or found on the map. The same
              pipeline as a website inquiry — a lead is a lead. */}
          <form onSubmit={addLead} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Restaurant"
                placeholder="Gopi Dining Hall"
                required
                value={lead.restaurantName}
                onChange={(e) => setLead((prev) => ({ ...prev, restaurantName: e.target.value }))}
              />
              <TextField
                label="Phone"
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                required
                value={lead.phone}
                onChange={(e) => setLead((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <TextField label="Area" placeholder="Adajan, Surat" value={lead.city} onChange={(e) => setLead((prev) => ({ ...prev, city: e.target.value }))} />
              <TextField label="Tables" placeholder="12" value={lead.tables} onChange={(e) => setLead((prev) => ({ ...prev, tables: e.target.value }))} />
            </div>
            <TextArea
              label="What they said"
              rows={2}
              placeholder="Owner was busy, said call back after 4pm. Two kitchens, no POS yet."
              value={lead.notes}
              onChange={(e) => setLead((prev) => ({ ...prev, notes: e.target.value }))}
            />
            <DateInput
              label="Come back on"
              hint="The second call is the one that sells — give it a date now."
              min={todayInIndia()}
              value={lead.followUpAt}
              onChange={(value) => setLead((prev) => ({ ...prev, followUpAt: value }))}
            />
            <div>
              <Button type="submit" size="lg" disabled={saving || !lead.restaurantName.trim() || !lead.phone.trim()}>
                {saving ? "Saving…" : "Save lead"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {!inquiries ? (
        <SkeletonCards count={3} minWidth={320} />
      ) : inquiries.length === 0 ? (
        <EmptyState
          title={filter === "DUE" ? "Nothing due today" : "Nothing here"}
          hint={filter === "DUE" ? "Leads whose follow-up day has come show up here." : "Demo requests from the website land here, and so do the leads you add."}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-base font-extrabold">
                    {inquiry.name}
                    {inquiry.restaurantName ? ` · ${inquiry.restaurantName}` : ""}
                  </span>
                  <span className="text-[13px] text-text-muted">
                    {[
                      inquiry.city,
                      inquiry.tables && `${inquiry.tables} tables`,
                      inquiry.kitchens && `${inquiry.kitchens} kitchen`,
                      formatDate(inquiry.createdAt),
                      inquiry.followUpAt && `come back ${formatDate(inquiry.followUpAt)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <Badge tone={TONE[inquiry.status]}>{inquiry.status.charAt(0) + inquiry.status.slice(1).toLowerCase()}</Badge>
              </div>

              {inquiry.message ? <p className="text-[15px] text-stone-700">{inquiry.message}</p> : null}
              <p className="text-[13px] text-text-muted">
                {inquiry.phone}
                {inquiry.email ? ` · ${inquiry.email}` : ""}
                {inquiry.source ? ` · from ${inquiry.source}` : ""}
                {inquiry.lang === "gu" ? " · read it in ગુજરાતી" : ""}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button href={`tel:${inquiry.phone.replace(/\s/g, "")}`} variant="dark" size="md">
                  Call
                </Button>
                <Button href={whatsappLink(inquiry, site)} variant="success" size="md">
                  WhatsApp
                </Button>
                {inquiry.status === "NEW" ? (
                  <Button variant="secondary" size="md" onClick={() => void update(inquiry.id, { status: "CONTACTED" })}>
                    Mark contacted
                  </Button>
                ) : null}
                {inquiry.status !== "CONVERTED" ? (
                  <Button variant="secondary" size="md" href="/hq">
                    Create restaurant
                  </Button>
                ) : null}
                {inquiry.status !== "LOST" && inquiry.status !== "CONVERTED" ? (
                  <Button variant="danger" size="md" onClick={() => void update(inquiry.id, { status: "LOST" })}>
                    Not interested
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                <TextArea
                  label="Notes"
                  rows={2}
                  defaultValue={inquiry.notes ?? ""}
                  onBlur={(e) => e.target.value !== (inquiry.notes ?? "") && void update(inquiry.id, { notes: e.target.value })}
                />
                <DateInput
                  label="Come back on"
                  min={todayInIndia()}
                  value={inquiry.followUpAt ? inquiry.followUpAt.slice(0, 10) : ""}
                  onChange={(value) => void update(inquiry.id, { followUpAt: value })}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
