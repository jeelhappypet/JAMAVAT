"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { TextArea } from "@/components/ui/TextField";
import { formatDate } from "@/components/hq/bits";
import type { InquiryDTO, InquiryStatus } from "@/types";

const FILTERS: { value: string; label: string }[] = [
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

/** The demo requests from the website, and what HQ did with each one. */
export function InquiriesScreen() {
  const [filter, setFilter] = useState("NEW");
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

  async function update(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/hq/inquiries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return setError(data?.error ?? "Couldn't save that");
    setInquiries((current) => (current ?? []).map((inquiry) => (inquiry.id === id ? data.inquiry : inquiry)));
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">Inquiries</h1>
        <SegmentedControl label="Filter inquiries" value={filter} onChange={setFilter} options={FILTERS} />
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {!inquiries ? (
        <SkeletonCards count={3} minWidth={320} />
      ) : inquiries.length === 0 ? (
        <EmptyState title="Nothing here" hint="Demo requests from the website land here." />
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
                    {[inquiry.city, inquiry.tables && `${inquiry.tables} tables`, inquiry.kitchens && `${inquiry.kitchens} kitchen`, formatDate(inquiry.createdAt)]
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

              <TextArea
                label="Notes"
                rows={2}
                defaultValue={inquiry.notes ?? ""}
                onBlur={(e) => e.target.value !== (inquiry.notes ?? "") && void update(inquiry.id, { notes: e.target.value })}
              />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
