"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { TextField } from "@/components/ui/TextField";
import { SubscriptionBadge, formatDate } from "@/components/hq/bits";
import type { HqRestaurantDTO, PlanDTO } from "@/types";

/** HQ's main screen: who the customers are, and adding one. */
export function RestaurantsScreen() {
  const [restaurants, setRestaurants] = useState<HqRestaurantDTO[] | null>(null);
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [invite, setInvite] = useState<{ name: string; link: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, planList] = await Promise.all([fetch("/api/hq/restaurants"), fetch("/api/hq/plans")]);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (list.status === 401) return window.location.assign("/hq/login");
      const data = await list.json();
      if (!list.ok) throw new Error(data?.error ?? "Couldn't load the restaurants");
      setRestaurants(data.restaurants);
      setPlans((await planList.json().catch(() => null))?.plans ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the restaurants");
      setRestaurants([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, [load]);

  const live = restaurants?.filter((restaurant) => restaurant.state === "ok" || restaurant.state === "due").length ?? 0;
  const ordersToday = restaurants?.reduce((sum, restaurant) => sum + restaurant.counts.ordersToday, 0) ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">Restaurants</h1>
        <Button onClick={() => setAdding(true)} size="lg">
          Add a restaurant
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Stat label="Restaurants" value={`${restaurants?.length ?? 0}`} note={`${live} live`} />
        <Stat label="Orders today" value={`${ordersToday}`} note="all restaurants" />
        <Stat label="Need attention" value={`${restaurants?.filter((r) => r.state !== "ok").length ?? 0}`} note="expiring, paused or due" />
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {!restaurants ? (
        <SkeletonCards count={3} minWidth={320} />
      ) : restaurants.length === 0 ? (
        <EmptyState title="No restaurants yet" hint="Add your first customer — they'll get a link to create their own owner login." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {restaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/hq/restaurants/${restaurant.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] border border-border bg-surface p-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-[17px] font-extrabold text-brand-dark">
                {restaurant.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
                <span className="truncate text-base font-extrabold">{restaurant.name}</span>
                <span className="truncate text-[13px] text-text-muted">/r/{restaurant.slug}</span>
              </span>
              <span className="text-[13px] text-stone-700">
                {restaurant.counts.seats} QR · {restaurant.counts.staff} staff · {restaurant.counts.ordersToday} today
              </span>
              <span className="text-[13px] text-text-muted">{restaurant.planName ?? "No plan"}</span>
              <SubscriptionBadge restaurant={restaurant} />
              {restaurant.inviteePending ? <Badge tone="orange">Invite not used</Badge> : null}
            </Link>
          ))}
        </div>
      )}

      <AddRestaurant
        open={adding}
        plans={plans}
        onClose={() => setAdding(false)}
        onCreated={(name, link) => {
          setAdding(false);
          setInvite({ name, link });
          void load();
        }}
      />

      <Modal open={Boolean(invite)} onClose={() => setInvite(null)} title="Restaurant added">
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-stone-700">
            Send this link to {invite?.name}&apos;s owner. It makes their first admin login, works once and lasts 14 days.
          </p>
          <code className="overflow-x-auto rounded-xl bg-surface-muted p-3 text-[13px]">{invite?.link}</code>
          <Button onClick={() => navigator.clipboard?.writeText(invite?.link ?? "")} variant="secondary" size="lg">
            Copy link
          </Button>
        </div>
      </Modal>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card className="flex min-w-0 flex-[1_1_180px] flex-col gap-0.5">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className="text-[26px] font-extrabold">
        {value} <span className="text-sm font-semibold text-text-muted">· {note}</span>
      </span>
    </Card>
  );
}

function AddRestaurant({
  open,
  plans,
  onClose,
  onCreated,
}: {
  open: boolean;
  plans: PlanDTO[];
  onClose: () => void;
  onCreated: (name: string, link: string) => void;
}) {
  const [form, setForm] = useState({ name: "", ownerName: "", ownerEmail: "", ownerPhone: "", city: "", planId: "", trialDays: "14" });
  const [sendInvite, setSendInvite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hq/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          ownerName: form.ownerName || undefined,
          ownerEmail: form.ownerEmail || undefined,
          ownerPhone: form.ownerPhone || undefined,
          city: form.city || undefined,
          planId: form.planId || undefined,
          trialDays: Number(form.trialDays) || 0,
          sendInvite: sendInvite && Boolean(form.ownerEmail),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't add the restaurant");
      onCreated(form.name, data.invite);
      setForm({ name: "", ownerName: "", ownerEmail: "", ownerPhone: "", city: "", planId: "", trialDays: "14" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the restaurant");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a restaurant">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <TextField label="Restaurant name" value={form.name} onChange={set("name")} required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Owner's name" value={form.ownerName} onChange={set("ownerName")} />
          <TextField label="City" value={form.city} onChange={set("city")} />
          <TextField label="Owner's email" type="email" value={form.ownerEmail} onChange={set("ownerEmail")} hint="The invite link goes here." />
          <TextField label="Owner's phone" type="tel" value={form.ownerPhone} onChange={set("ownerPhone")} />
          <Select
            label="Plan"
            value={form.planId}
            onChange={(value) => setForm((f) => ({ ...f, planId: value }))}
            options={[{ value: "", label: "No plan yet" }, ...plans.filter((plan) => plan.isActive).map((plan) => ({ value: plan.id, label: plan.name.en }))]}
          />
          <TextField label="Trial days" type="number" min={0} max={180} value={form.trialDays} onChange={set("trialDays")} />
        </div>
        <Checkbox checked={sendInvite} onChange={setSendInvite} label="Email the invite link to the owner" />
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" disabled={busy || !form.name}>
          {busy ? "Adding…" : "Add & make the invite link"}
        </Button>
      </form>
    </Modal>
  );
}

export { formatDate };
