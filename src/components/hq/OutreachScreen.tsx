"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SidePanel } from "@/components/ui/SidePanel";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { TextArea, TextField } from "@/components/ui/TextField";
import { formatDate } from "@/components/hq/bits";
import { LEAD_COLUMNS } from "@/lib/outreach/leadColumns";
import type { OutreachChannel, OutreachTouchDTO, SponsorLeadDTO, SponsorLeadStatus } from "@/types";

const FILTERS = [
  { value: "DUE", label: "Due" },
  { value: "ACTIVE", label: "Active" },
  { value: "REPLIED", label: "Replied" },
  { value: "WON", label: "Won" },
  { value: "TODO", label: "No contact" },
  { value: "DEAD", label: "Dead" },
  { value: "ALL", label: "All" },
];

const TONE: Record<SponsorLeadStatus, "green" | "orange" | "stone" | "red" | "brand"> = {
  TODO: "stone",
  ACTIVE: "orange",
  REPLIED: "brand",
  WON: "green",
  DEAD: "red",
};

interface Setup {
  email: "unset" | "shared-account" | null;
  whatsapp: "unset" | "no-template" | "shared-number" | null;
  digestTo: string | null;
}

interface Today {
  emails: number;
  emailsFailed: number;
  whatsapp: number;
  whatsappFailed: number;
  emailCap: number;
  whatsappCap: number;
}

const CHANNEL: Record<OutreachChannel, string> = { email: "Email", whatsapp: "WhatsApp", visit: "Visit" };

/** What a setup problem means, in the words of what breaks if it isn't fixed. */
const EMAIL_PROBLEM: Record<NonNullable<Setup["email"]>, string> = {
  unset: "No outreach email account is set, so the bot is sending nothing. Set OUTREACH_SMTP_USER and OUTREACH_SMTP_PASS to an address that is not the one sending guest bills.",
  "shared-account":
    "Stopped on purpose: the outreach account is the same one that sends guest bills and OTPs. Cold mail from it would put those OTPs in spam and break ordering. Use a separate address.",
};

const WA_PROBLEM: Record<NonNullable<Setup["whatsapp"]>, string> = {
  unset: "WhatsApp isn't configured at all, so those steps are waiting for you to tap.",
  "no-template":
    "No approved template, so the bot can't message anyone who hasn't written to you first — Meta only delivers templates outside the 24-hour window. Those steps are waiting for you to tap instead.",
  "shared-number":
    "No separate outreach number, so the bot won't send WhatsApp itself: marketing templates on the number your restaurants use could get it restricted. Set WHATSAPP_OUTREACH_PHONE_NUMBER_ID, or keep tapping the links by hand.",
};

/** WhatsApp ticks are Meta's own and exact. An email "seen" is a pixel, and a pixel is a guess. */
function Indicator({ touch }: { touch: OutreachTouchDTO }) {
  if (touch.failure) return <span className="font-bold text-red-700">Not sent — {touch.failure}</span>;
  if (touch.channel === "whatsapp") {
    if (touch.readAt) return <span className="font-bold text-sky-600">✓✓ Read</span>;
    if (touch.deliveredAt) return <span className="font-bold text-stone-500">✓✓ Delivered</span>;
    return <span className="text-stone-500">✓ Sent</span>;
  }
  if (touch.channel === "email") {
    if (touch.readAt) {
      return (
        <span className="text-stone-500">
          <span className="font-bold text-sky-600">Opened</span>{" "}
          <span title="An image in the mail was fetched. Gmail and Apple Mail fetch images on their own, so this can fire before anyone reads it — and a client with images off never fires at all.">
            (approx)
          </span>
        </span>
      );
    }
    return <span className="text-stone-500">Sent — no open yet</span>;
  }
  return <span className="text-stone-500">Done</span>;
}

/** The thread for one lead: everything that was sent, oldest first, like a chat. */
function Thread({ lead }: { lead: SponsorLeadDTO }) {
  if (!lead.touches.length) return <EmptyState title="Nothing sent yet" hint="The bot picks this one up on its next run." />;
  return (
    <ol className="flex flex-col gap-3">
      {lead.touches.map((touch, index) => (
        <li key={`${touch.at}-${index}`} className="rounded-[14px] border border-border bg-surface-muted p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="font-extrabold">
              {CHANNEL[touch.channel]} <span className="font-semibold text-stone-500">· step {touch.step + 1}</span>
            </span>
            <span className="text-stone-500">{formatDate(touch.at)}</span>
          </div>
          {touch.summary ? <p className="mt-1.5 text-sm font-bold">{touch.summary}</p> : null}
          {touch.text ? <pre className="mt-1.5 whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-stone-700">{touch.text}</pre> : null}
          <p className="mt-2 text-[12px]">
            <Indicator touch={touch} />
          </p>
        </li>
      ))}
    </ol>
  );
}

/** The sponsor pipeline: what the bot sent, what it is waiting on, and what each one answered. */
export function OutreachScreen() {
  const [filter, setFilter] = useState("DUE");
  const [leads, setLeads] = useState<SponsorLeadDTO[] | null>(null);
  const [counts, setCounts] = useState<Partial<Record<SponsorLeadStatus, number>>>({});
  const [today, setToday] = useState<Today | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [open, setOpen] = useState<SponsorLeadDTO | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ran, setRan] = useState<string | null>(null);
  const [adding, setAdding] = useState<"one" | "paste" | null>(null);
  const [lead, setLead] = useState({ business: "", category: "", area: "", ownerName: "", email: "", phone: "", sessionsInArea: "" });
  const [csv, setCsv] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hq/outreach?status=${filter}`);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (res.status === 401) return window.location.assign("/hq/login");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't load the outreach list");
      setLeads(data.leads);
      setCounts(data.counts);
      setToday(data.today);
      setSetup(data.setup);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the outreach list");
      setLeads([]);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, [load]);

  async function patch(lead: SponsorLeadDTO, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/hq/outreach/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "That didn't save");
      setOpen(data.lead);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save");
    } finally {
      setBusy(false);
    }
  }

  /** Both ways in go through the same endpoint; only the body differs. */
  async function add(body: Record<string, unknown>) {
    setBusy(true);
    setRan(null);
    try {
      const res = await fetch("/api/hq/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "That didn't save");
      setRan(`${data.created} added, ${data.updated} updated, ${data.unchanged} already there${data.blank ? `, ${data.blank} rows skipped (no business name)` : ""}.`);
      setAdding(null);
      setLead({ business: "", category: "", area: "", ownerName: "", email: "", phone: "", sessionsInArea: "" });
      setCsv("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save");
    } finally {
      setBusy(false);
    }
  }

  async function runNow() {
    setBusy(true);
    setRan(null);
    try {
      const res = await fetch("/api/cron/outreach", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "The run failed");
      setRan(`${data.emailsSent} emails and ${data.whatsappSent} WhatsApp sent, ${data.manual.length} waiting for you.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The run failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold">Sponsor outreach</h1>
        <span className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => setAdding("one")} disabled={busy}>
            Add a lead
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAdding("paste")} disabled={busy}>
            Paste a sheet
          </Button>
          <Button variant="ghost" size="sm" href="/api/hq/outreach/sheet">
            Download sheet
          </Button>
          <Button variant="secondary" size="sm" onClick={runNow} disabled={busy}>
            {busy ? "Running…" : "Run now"}
          </Button>
        </span>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {ran ? <Alert tone="success">{ran}</Alert> : null}
      {setup?.email ? <Alert>{EMAIL_PROBLEM[setup.email]}</Alert> : null}
      {setup?.whatsapp ? <Alert tone="warning">{WA_PROBLEM[setup.whatsapp]}</Alert> : null}

      {today ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card padding="sm">
            <p className="text-[12px] font-bold text-stone-500">Emails today</p>
            <p className="text-[22px] font-extrabold">
              {today.emails}
              <span className="text-[14px] font-bold text-stone-400"> / {today.emailCap}</span>
            </p>
            {today.emailsFailed ? <p className="text-[12px] font-bold text-red-700">{today.emailsFailed} failed</p> : null}
          </Card>
          <Card padding="sm">
            <p className="text-[12px] font-bold text-stone-500">WhatsApp today</p>
            <p className="text-[22px] font-extrabold">
              {today.whatsapp}
              <span className="text-[14px] font-bold text-stone-400"> / {today.whatsappCap}</span>
            </p>
            {today.whatsappFailed ? <p className="text-[12px] font-bold text-red-700">{today.whatsappFailed} failed</p> : null}
          </Card>
          <Card padding="sm">
            <p className="text-[12px] font-bold text-stone-500">Replied</p>
            <p className="text-[22px] font-extrabold">{counts.REPLIED ?? 0}</p>
          </Card>
          <Card padding="sm">
            <p className="text-[12px] font-bold text-stone-500">Won</p>
            <p className="text-[22px] font-extrabold">{counts.WON ?? 0}</p>
          </Card>
        </div>
      ) : null}

      <SegmentedControl label="Filter leads" value={filter} onChange={setFilter} options={FILTERS} />

      {leads === null ? (
        <SkeletonCards />
      ) : leads.length === 0 ? (
        <EmptyState
          title="Nothing here"
          hint={
            filter === "DUE"
              ? "No lead is due today. The bot runs every weekday at 10:30."
              : "Fill sponsor-outreach.csv and run scripts/import-sponsors.mjs --write."
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {leads.map((lead) => (
            <li key={lead.id}>
              <Card
                padding="sm"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setOpen(lead);
                  setNotes(lead.notes ?? "");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setOpen(lead);
                    setNotes(lead.notes ?? "");
                  }
                }}
                className="transition-colors hover:border-stone-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold">{lead.business}</span>
                  <Badge tone={TONE[lead.status]} size="sm">
                    {lead.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[13px] font-semibold text-stone-500">
                  {lead.category} · {lead.area}
                  {lead.sessionsInArea ? ` · ~${lead.sessionsInArea.toLocaleString("en-IN")} guests/mo` : " · no audience yet"}
                </p>
                <p className="mt-1 text-[12px] font-semibold text-stone-500">
                  {lead.touches.filter((touch) => !touch.failure).length} sent
                  {lead.touches.some((touch) => touch.readAt) ? " · opened" : ""}
                  {lead.nextActionAt ? ` · next ${formatDate(lead.nextActionAt)}` : lead.closedReason ? ` · ${lead.closedReason}` : ""}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={adding === "one"}
        title="Add a lead"
        onClose={() => setAdding(null)}
        onSubmit={(event) => {
          event.preventDefault();
          void add({ lead: { ...lead, sessionsInArea: lead.sessionsInArea || "0" } });
        }}
        footer={
          <Button type="submit" variant="primary" size="sm" disabled={busy || !lead.business.trim()}>
            {busy ? "Saving…" : "Add"}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField label="Business" value={lead.business} onChange={(e) => setLead({ ...lead, business: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Category" hint="Gym, Dental clinic…" value={lead.category} onChange={(e) => setLead({ ...lead, category: e.target.value })} />
            <TextField label="Area" hint="Adajan, Vesu…" value={lead.area} onChange={(e) => setLead({ ...lead, area: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Email" type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} />
            <TextField label="Phone" type="tel" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Owner's name" value={lead.ownerName} onChange={(e) => setLead({ ...lead, ownerName: e.target.value })} />
            <TextField
              label="Guests a month in this area"
              hint="Live restaurants there × 1,800. It goes into the pitch, so it has to be true."
              type="number"
              value={lead.sessionsInArea}
              onChange={(e) => setLead({ ...lead, sessionsInArea: e.target.value })}
            />
          </div>
          <p className="text-[12px] text-stone-500">
            With an email or a phone the bot picks it up on its next run. With neither it waits under “No contact” until you fill one in.
          </p>
        </div>
      </Modal>

      <Modal
        open={adding === "paste"}
        title="Paste a sheet"
        onClose={() => setAdding(null)}
        footer={
          <Button variant="primary" size="sm" onClick={() => void add({ csv })} disabled={busy || !csv.trim()}>
            {busy ? "Importing…" : "Import"}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13px] leading-relaxed text-stone-600">
            Copy the rows straight out of your spreadsheet, headings and all — any column order, extras ignored, only <code>business</code> required.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" href="/api/hq/outreach/sheet?blank=1">
              Download a blank sheet
            </Button>
            <Button variant="ghost" size="sm" href="/api/hq/outreach/sheet">
              Download what is already here
            </Button>
          </div>
          <details className="rounded-[12px] border border-border bg-surface-muted p-3">
            <summary className="cursor-pointer text-[13px] font-bold">What each column is for</summary>
            <dl className="mt-2 flex flex-col gap-1.5">
              {LEAD_COLUMNS.map((column) => (
                <div key={column.name} className="text-[12px] leading-relaxed">
                  <dt className="inline font-mono font-bold">{column.name}</dt>
                  <dd className="inline text-stone-600"> — {column.hint}</dd>
                </div>
              ))}
            </dl>
          </details>
          <TextArea
            label="Rows"
            rows={10}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={"business,category,area,email,phone,sessions_in_area\nIron Fitness,Gym,Adajan,owner@iron.in,9876543210,9000"}
            className="font-mono text-[12px]"
          />
          <p className="text-[12px] text-stone-500">
            Safe to paste the same rows again: a lead already in the sequence keeps its history and only gets its blanks filled in.
          </p>
        </div>
      </Modal>

      <SidePanel open={Boolean(open)} title={open?.business ?? ""} onClose={() => setOpen(null)}>
        {open ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[13px] font-semibold text-stone-500">
                {open.category} · {open.area}
              </p>
              {open.email ? <p className="text-[13px] font-semibold">{open.email}</p> : null}
              {open.phone ? <p className="text-[13px] font-semibold">{open.phone}</p> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="success" onClick={() => patch(open, { status: "WON" })} disabled={busy}>
                Won
              </Button>
              <Button size="sm" variant="secondary" onClick={() => patch(open, { status: "REPLIED" })} disabled={busy}>
                They replied
              </Button>
              <Button size="sm" variant="outline" onClick={() => patch(open, { status: "DEAD" })} disabled={busy}>
                Dead
              </Button>
              {open.status !== "ACTIVE" ? (
                <Button size="sm" variant="ghost" onClick={() => patch(open, { status: "ACTIVE" })} disabled={busy}>
                  Reopen
                </Button>
              ) : null}
            </div>

            {open.whatsappLink ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="success" href={open.whatsappLink}>
                  Open WhatsApp
                </Button>
                <Button size="sm" variant="outline" onClick={() => patch(open, { didStep: true })} disabled={busy}>
                  Mark this step done
                </Button>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-extrabold">Thread</h3>
              <Thread lead={open} />
            </div>

            <div>
              <TextArea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => patch(open, { notes })} disabled={busy}>
                Save notes
              </Button>
            </div>

            <p className="text-[12px] leading-relaxed text-stone-500">
              An email reply is the one thing nothing here can see — no inbox is read. Mark it yourself, or the day-7 follow-up goes out on top of their
              answer. A WhatsApp reply stops the sequence by itself.
            </p>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
