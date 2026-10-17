"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { TextArea, TextField } from "@/components/ui/TextField";
import { SubscriptionBadge, formatDate, rupees } from "@/components/hq/bits";
import { RESTAURANT_STATUSES, SUBSCRIPTION_PAYMENT_METHODS, type HqRestaurantDTO, type PlanDTO, type SubscriptionPaymentDTO } from "@/types";

/** One customer: their subscription, their details, and the payments they've made. */
export function RestaurantDetail({ id }: { id: string }) {
  const [restaurant, setRestaurant] = useState<HqRestaurantDTO | null>(null);
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [payments, setPayments] = useState<SubscriptionPaymentDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [invite, setInvite] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [one, planList, paymentList] = await Promise.all([
        fetch(`/api/hq/restaurants/${id}`),
        fetch("/api/hq/plans"),
        fetch(`/api/hq/restaurants/${id}/payments`),
      ]);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (one.status === 401) return window.location.assign("/hq/login");
      const data = await one.json();
      if (!one.ok) throw new Error(data?.error ?? "Couldn't load this restaurant");
      setRestaurant(data.restaurant);
      setPlans((await planList.json().catch(() => null))?.plans ?? []);
      setPayments((await paymentList.json().catch(() => null))?.payments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this restaurant");
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/hq/restaurants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Couldn't save that");
      return;
    }
    setRestaurant(data.restaurant);
    if (data.invite) setInvite(data.invite);
  }

  if (!restaurant) {
    return (
      <>
        {error ? <Alert>{error}</Alert> : null}
        <SkeletonCards count={2} minWidth={320} />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href="/hq" className="text-sm font-bold text-text-muted">
            ← Restaurants
          </Link>
          <h1 className="truncate text-[26px] font-extrabold tracking-tight">{restaurant.name}</h1>
          <span className="text-[13px] text-text-muted">/r/{restaurant.slug}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SubscriptionBadge restaurant={restaurant} />
          <Button href={`/r/${restaurant.slug}/login`} variant="secondary" size="md">
            Open their app
          </Button>
        </div>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="flex flex-wrap gap-4">
        <Card className="flex min-w-0 flex-[2_1_380px] flex-col gap-4">
          <h2 className="text-lg font-extrabold">Subscription</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Plan"
              value={restaurant.planId ?? ""}
              onChange={(value) => void patch({ planId: value || null })}
              options={[{ value: "", label: "No plan" }, ...plans.map((plan) => ({ value: plan.id, label: plan.name.en }))]}
            />
            <Select
              label="Status"
              value={restaurant.status}
              onChange={(value) => void patch({ status: value })}
              options={RESTAURANT_STATUSES.map((status) => ({ value: status, label: status.charAt(0) + status.slice(1).toLowerCase() }))}
            />
            <Select
              label="Billing"
              value={restaurant.billingCycle}
              onChange={(value) => void patch({ billingCycle: value })}
              options={[
                { value: "MONTHLY", label: "Monthly" },
                { value: "YEARLY", label: "Yearly" },
              ]}
            />
            <TextField
              label="Paid until"
              type="date"
              defaultValue={restaurant.paidUntil?.slice(0, 10) ?? ""}
              onBlur={(e) => void patch({ paidUntil: e.target.value || null })}
              hint="Empty means no end date."
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border pt-3">
            <span className="text-[15px] text-stone-700">
              {restaurant.paidUntil ? `Ends ${formatDate(restaurant.paidUntil)}` : "No end date"}
              {restaurant.daysLeft !== undefined ? ` · ${restaurant.daysLeft} days` : ""} · {restaurant.graceDays} grace days
            </span>
            <Button onClick={() => setRecording(true)} size="md">
              Record a payment
            </Button>
          </div>
        </Card>

        <Card className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
          <h2 className="text-lg font-extrabold">Usage</h2>
          <p className="text-[15px] text-stone-700">{restaurant.counts.seats} QR codes</p>
          <p className="text-[15px] text-stone-700">{restaurant.counts.staff} staff logins</p>
          <p className="text-[15px] text-stone-700">{restaurant.counts.ordersToday} orders today</p>
          <p className="text-[13px] text-text-muted">Customer since {formatDate(restaurant.createdAt)}</p>
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">Owner & link</h2>
          <Button variant="secondary" size="md" onClick={() => void patch({ reinvite: true })}>
            {restaurant.hasStaff ? "Send a fresh invite link" : "Resend the invite link"}
          </Button>
        </div>
        {!restaurant.hasStaff ? (
          <Alert tone="warning">No login has been created yet — the owner still has to open their invite link.</Alert>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Owner's name" defaultValue={restaurant.ownerName ?? ""} onBlur={(e) => void patch({ ownerName: e.target.value })} />
          <TextField label="Owner's phone" defaultValue={restaurant.ownerPhone ?? ""} onBlur={(e) => void patch({ ownerPhone: e.target.value })} />
          <TextField label="Owner's email" defaultValue={restaurant.ownerEmail ?? ""} onBlur={(e) => void patch({ ownerEmail: e.target.value })} />
          <TextField label="City" defaultValue={restaurant.city ?? ""} onBlur={(e) => void patch({ city: e.target.value })} />
          <TextField
            label="Link (slug)"
            defaultValue={restaurant.slug}
            onBlur={(e) => e.target.value !== restaurant.slug && void patch({ slug: e.target.value })}
            hint="The old link keeps redirecting here."
          />
          <TextField label="Restaurant name" defaultValue={restaurant.name} onBlur={(e) => void patch({ name: e.target.value })} />
        </div>
        <TextArea label="Notes" rows={3} defaultValue={restaurant.notes ?? ""} onBlur={(e) => void patch({ notes: e.target.value })} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-[15px] text-text-muted">Nothing recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-border pb-2 text-[15px]">
                <span className="font-bold">{rupees(payment.amount)}</span>
                <span className="text-text-muted">
                  {payment.method} · {payment.months} month{payment.months > 1 ? "s" : ""} · {formatDate(payment.paidAt)}
                </span>
                <span className="text-text-muted">until {formatDate(payment.paidUntil)}</span>
                {payment.note ? <span className="text-text-muted">{payment.note}</span> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <RecordPayment
        open={recording}
        onClose={() => setRecording(false)}
        restaurantId={id}
        onRecorded={() => {
          setRecording(false);
          void load();
        }}
      />

      <Modal open={Boolean(invite)} onClose={() => setInvite(null)} title="New invite link">
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-stone-700">The previous link no longer works. This one lasts 14 days.</p>
          <code className="overflow-x-auto rounded-xl bg-surface-muted p-3 text-[13px]">{invite}</code>
          <Button variant="secondary" size="lg" onClick={() => navigator.clipboard?.writeText(invite ?? "")}>
            Copy link
          </Button>
        </div>
      </Modal>
    </>
  );
}

function RecordPayment({
  open,
  restaurantId,
  onClose,
  onRecorded,
}: {
  open: boolean;
  restaurantId: string;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [form, setForm] = useState({ amount: "", method: "UPI", months: "1", paidAt: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/hq/restaurants/${restaurantId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.amount) || 0,
          method: form.method,
          months: Number(form.months) || 1,
          paidAt: form.paidAt || undefined,
          note: form.note || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't record that payment");
      setForm({ amount: "", method: "UPI", months: "1", paidAt: "", note: "" });
      onRecorded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record that payment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record a payment">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <p className="text-[15px] text-text-muted">This moves their period forward — from the current end if it hasn&apos;t passed, otherwise from today.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Amount (₹)" type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
          <Select
            label="Paid by"
            value={form.method}
            onChange={(value) => setForm((f) => ({ ...f, method: value }))}
            options={SUBSCRIPTION_PAYMENT_METHODS.map((method) => ({ value: method, label: method.charAt(0) + method.slice(1).toLowerCase() }))}
          />
          <TextField label="Months" type="number" min={1} max={36} value={form.months} onChange={(e) => setForm((f) => ({ ...f, months: e.target.value }))} />
          <TextField label="Paid on" type="date" value={form.paidAt} onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))} hint="Today if left empty." />
        </div>
        <TextField label="Note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Saving…" : "Record payment"}
        </Button>
      </form>
    </Modal>
  );
}
