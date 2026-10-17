"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { TextField } from "@/components/ui/TextField";
import { rupees } from "@/components/hq/bits";
import type { PlanDTO } from "@/types";

interface Draft {
  nameEn: string;
  nameGu: string;
  descriptionEn: string;
  descriptionGu: string;
  priceMonthly: string;
  priceYearly: string;
  maxSeats: string;
  maxStaff: string;
  whatsapp: boolean;
  isPublic: boolean;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: string;
}

const emptyDraft: Draft = {
  nameEn: "",
  nameGu: "",
  descriptionEn: "",
  descriptionGu: "",
  priceMonthly: "",
  priceYearly: "",
  maxSeats: "",
  maxStaff: "",
  whatsapp: false,
  isPublic: true,
  isPopular: false,
  isActive: true,
  sortOrder: "0",
};

const draftOf = (plan: PlanDTO): Draft => ({
  nameEn: plan.name.en,
  nameGu: plan.name.gu,
  descriptionEn: plan.description.en,
  descriptionGu: plan.description.gu,
  priceMonthly: String(plan.priceMonthly || ""),
  priceYearly: String(plan.priceYearly || ""),
  maxSeats: plan.maxSeats === undefined ? "" : String(plan.maxSeats),
  maxStaff: plan.maxStaff === undefined ? "" : String(plan.maxStaff),
  whatsapp: plan.whatsapp,
  isPublic: plan.isPublic,
  isPopular: plan.isPopular,
  isActive: plan.isActive,
  sortOrder: String(plan.sortOrder),
});

const bodyOf = (draft: Draft) => ({
  name: { en: draft.nameEn, gu: draft.nameGu },
  description: { en: draft.descriptionEn, gu: draft.descriptionGu },
  priceMonthly: Number(draft.priceMonthly) || 0,
  priceYearly: Number(draft.priceYearly) || 0,
  // Empty means no limit, which is stored as "no value" rather than zero.
  maxSeats: draft.maxSeats === "" ? null : Number(draft.maxSeats),
  maxStaff: draft.maxStaff === "" ? null : Number(draft.maxStaff),
  whatsapp: draft.whatsapp,
  isPublic: draft.isPublic,
  isPopular: draft.isPopular,
  isActive: draft.isActive,
  sortOrder: Number(draft.sortOrder) || 0,
});

/** The subscription plans: what they cost, what they allow, and which show on the website. */
export function PlansScreen() {
  const [plans, setPlans] = useState<PlanDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/hq/plans");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (res.status === 401) return window.location.assign("/hq/login");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't load the plans");
      setPlans(data.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the plans");
      setPlans([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, [load]);

  async function save() {
    if (!editing) return;
    const res = await fetch(editing.id ? `/api/hq/plans/${editing.id}` : "/api/hq/plans", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyOf(editing.draft)),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return setError(data?.error ?? "Couldn't save the plan");
    setEditing(null);
    void load();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">Plans</h1>
        <Button size="lg" onClick={() => setEditing({ draft: emptyDraft })}>
          Add a plan
        </Button>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {!plans ? (
        <SkeletonCards count={2} minWidth={300} />
      ) : plans.length === 0 ? (
        <EmptyState title="No plans yet" hint="A plan sets the price and the limits — and shows on the website once it's public." />
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-extrabold">{plan.name.en || "Untitled"}</h2>
                <div className="flex gap-1.5">
                  {plan.isPublic ? <Badge tone="green">On the website</Badge> : <Badge tone="stone">Private</Badge>}
                  {!plan.isActive ? <Badge tone="red">Archived</Badge> : null}
                </div>
              </div>
              <p className="text-[15px] text-stone-700">
                {plan.priceMonthly > 0 ? `${rupees(plan.priceMonthly)} / month` : "Price on request"}
                {plan.priceYearly > 0 ? ` · ${rupees(plan.priceYearly)} / year` : ""}
              </p>
              <p className="text-[13px] text-text-muted">
                {plan.maxSeats === undefined ? "Unlimited QR" : `${plan.maxSeats} QR`} ·{" "}
                {plan.maxStaff === undefined ? "unlimited staff" : `${plan.maxStaff} staff`}
                {plan.whatsapp ? " · WhatsApp inbox" : ""}
              </p>
              <p className="text-[13px] text-text-muted">{plan.restaurantCount} restaurant{plan.restaurantCount === 1 ? "" : "s"} on it</p>
              <Button variant="secondary" size="md" className="mt-auto self-start" onClick={() => setEditing({ id: plan.id, draft: draftOf(plan) })}>
                Edit
              </Button>
            </Card>
          ))}
        </div>
      )}

      {editing ? (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? "Edit plan" : "Add a plan"}>
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="Name (English)" value={editing.draft.nameEn} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, nameEn: e.target.value } })} />
              <TextField label="Name (ગુજરાતી)" value={editing.draft.nameGu} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, nameGu: e.target.value } })} />
              <TextField
                label="₹ per month"
                type="number"
                min={0}
                hint="0 shows “Talk to us” on the website."
                value={editing.draft.priceMonthly}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, priceMonthly: e.target.value } })}
              />
              <TextField
                label="₹ per year"
                type="number"
                min={0}
                value={editing.draft.priceYearly}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, priceYearly: e.target.value } })}
              />
              <TextField
                label="QR codes allowed"
                type="number"
                min={0}
                hint="Empty = unlimited."
                value={editing.draft.maxSeats}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, maxSeats: e.target.value } })}
              />
              <TextField
                label="Staff logins allowed"
                type="number"
                min={0}
                hint="Empty = unlimited."
                value={editing.draft.maxStaff}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, maxStaff: e.target.value } })}
              />
            </div>
            <TextField
              label="One line (English)"
              value={editing.draft.descriptionEn}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, descriptionEn: e.target.value } })}
            />
            <TextField
              label="One line (ગુજરાતી)"
              value={editing.draft.descriptionGu}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, descriptionGu: e.target.value } })}
            />
            <div className="flex flex-wrap gap-4">
              <Checkbox checked={editing.draft.isPublic} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, isPublic: v } })} label="Show on the website" />
              <Checkbox checked={editing.draft.isPopular} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, isPopular: v } })} label="Most popular" />
              <Checkbox checked={editing.draft.whatsapp} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, whatsapp: v } })} label="WhatsApp inbox" />
              <Checkbox checked={editing.draft.isActive} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, isActive: v } })} label="Can be picked" />
            </div>
            <Button size="lg" onClick={save} disabled={!editing.draft.nameEn}>
              Save plan
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
