"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { TextArea, TextField } from "@/components/ui/TextField";
import { SubscriptionBadge, formatDate, rupees } from "@/components/hq/bits";
import { DeleteRestaurantDialog } from "@/components/hq/DeleteRestaurantDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RESTAURANT_STATUSES, SUBSCRIPTION_PAYMENT_METHODS, type HqRestaurantDTO, type PlanDTO, type SubscriptionPaymentDTO } from "@/types";

function toSubscriptionForm(r: HqRestaurantDTO) {
  return { planId: r.planId ?? "", status: r.status, billingCycle: r.billingCycle, paidUntil: r.paidUntil?.slice(0, 10) ?? "" };
}
type SubscriptionForm = ReturnType<typeof toSubscriptionForm>;

function toOwnerForm(r: HqRestaurantDTO) {
  return {
    ownerName: r.ownerName ?? "",
    ownerPhone: r.ownerPhone ?? "",
    ownerEmail: r.ownerEmail ?? "",
    city: r.city ?? "",
    ownerUsername: r.ownerUsername ?? "",
    slug: r.slug,
    name: r.name,
    notes: r.notes ?? "",
  };
}
type OwnerForm = ReturnType<typeof toOwnerForm>;

/** One customer: their subscription, their details, and the payments they've made. */
export function RestaurantDetail({ id }: { id: string }) {
  const [restaurant, setRestaurant] = useState<HqRestaurantDTO | null>(null);
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [payments, setPayments] = useState<SubscriptionPaymentDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SubscriptionPaymentDTO | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<SubscriptionPaymentDTO | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);

  const [subForm, setSubForm] = useState<SubscriptionForm | null>(null);
  const [subBusy, setSubBusy] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subSaved, setSubSaved] = useState(false);

  const [ownerForm, setOwnerForm] = useState<OwnerForm | null>(null);
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [ownerSaved, setOwnerSaved] = useState(false);

  const initializedFor = useRef<string | null>(null);

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

  // Only re-derives the staged forms once per restaurant — so a reload triggered by an unrelated
  // action (recording a payment) never clobbers an edit still in progress in these two cards.
  useEffect(() => {
    if (restaurant && initializedFor.current !== restaurant.id) {
      setSubForm(toSubscriptionForm(restaurant));
      setOwnerForm(toOwnerForm(restaurant));
      initializedFor.current = restaurant.id;
    }
  }, [restaurant]);

  async function patch(body: Record<string, unknown>): Promise<HqRestaurantDTO> {
    const res = await fetch(`/api/hq/restaurants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Couldn't save that");
    setRestaurant(data.restaurant);
    if (data.invite) setInvite(data.invite);
    return data.restaurant;
  }

  async function saveSubscription() {
    if (!subForm) return;
    setSubBusy(true);
    setSubError(null);
    setSubSaved(false);
    try {
      const updated = await patch({
        planId: subForm.planId || null,
        status: subForm.status,
        billingCycle: subForm.billingCycle,
        paidUntil: subForm.paidUntil || null,
      });
      setSubForm(toSubscriptionForm(updated));
      setSubSaved(true);
    } catch (err) {
      setSubError(err instanceof Error ? err.message : "Couldn't save that");
    } finally {
      setSubBusy(false);
    }
  }

  async function saveOwner() {
    if (!ownerForm) return;
    setOwnerBusy(true);
    setOwnerError(null);
    setOwnerSaved(false);
    try {
      const updated = await patch({
        ownerName: ownerForm.ownerName,
        ownerPhone: ownerForm.ownerPhone,
        ownerEmail: ownerForm.ownerEmail,
        city: ownerForm.city,
        ownerUsername: ownerForm.ownerUsername || null,
        notes: ownerForm.notes,
        name: ownerForm.name,
        ...(ownerForm.slug !== restaurant?.slug ? { slug: ownerForm.slug } : {}),
      });
      setOwnerForm(toOwnerForm(updated));
      setOwnerSaved(true);
    } catch (err) {
      setOwnerError(err instanceof Error ? err.message : "Couldn't save that");
    } finally {
      setOwnerBusy(false);
    }
  }

  if (!restaurant || !subForm || !ownerForm) {
    return (
      <>
        {error ? <Alert>{error}</Alert> : null}
        <SkeletonCards count={2} minWidth={320} />
      </>
    );
  }

  const subDirty = JSON.stringify(subForm) !== JSON.stringify(toSubscriptionForm(restaurant));
  const ownerDirty = JSON.stringify(ownerForm) !== JSON.stringify(toOwnerForm(restaurant));

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
          <Button variant="danger" size="md" onClick={() => setDeleting(true)}>
            Delete
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
              value={subForm.planId}
              onChange={(value) => setSubForm((f) => f && { ...f, planId: value })}
              options={[{ value: "", label: "No plan" }, ...plans.map((plan) => ({ value: plan.id, label: plan.name.en }))]}
            />
            <Select
              label="Status"
              value={subForm.status}
              onChange={(value) => setSubForm((f) => f && { ...f, status: value as HqRestaurantDTO["status"] })}
              options={RESTAURANT_STATUSES.map((status) => ({ value: status, label: status.charAt(0) + status.slice(1).toLowerCase() }))}
            />
            <Select
              label="Billing"
              value={subForm.billingCycle}
              onChange={(value) => setSubForm((f) => f && { ...f, billingCycle: value as HqRestaurantDTO["billingCycle"] })}
              options={[
                { value: "MONTHLY", label: "Monthly" },
                { value: "YEARLY", label: "Yearly" },
              ]}
            />
            <TextField
              label="Paid until"
              type="date"
              value={subForm.paidUntil}
              onChange={(e) => setSubForm((f) => f && { ...f, paidUntil: e.target.value })}
              hint="Empty means no end date."
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border pt-3">
            <span className="text-[15px] text-stone-700">
              {restaurant.paidUntil ? `Ends ${formatDate(restaurant.paidUntil)}` : "No end date"}
              {restaurant.daysLeft !== undefined ? ` · ${restaurant.daysLeft} days` : ""} · {restaurant.graceDays} grace days
            </span>
            <div className="flex items-center gap-2">
              {subSaved && !subDirty ? <span className="text-[13px] font-bold text-green-700">Saved</span> : null}
              <Button variant="secondary" size="md" onClick={saveSubscription} disabled={!subDirty || subBusy}>
                {subBusy ? "Saving…" : "Save"}
              </Button>
              <Button onClick={() => setRecording(true)} size="md">
                Record a payment
              </Button>
            </div>
          </div>
          {subError ? <Alert>{subError}</Alert> : null}
          <p className="text-[13px] text-text-muted">
            Recording, editing or deleting a payment recalculates &quot;Paid until&quot; from the full payment history — it will replace a value saved here by hand.
          </p>
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
          <Alert tone="warning">No login has been created yet — the owner still has to open their invite link. Their jamavat.com login (below) won&apos;t work until then.</Alert>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Owner's name" value={ownerForm.ownerName} onChange={(e) => setOwnerForm((f) => f && { ...f, ownerName: e.target.value })} />
          <TextField label="Owner's phone" value={ownerForm.ownerPhone} onChange={(e) => setOwnerForm((f) => f && { ...f, ownerPhone: e.target.value })} />
          <TextField label="Owner's email" value={ownerForm.ownerEmail} onChange={(e) => setOwnerForm((f) => f && { ...f, ownerEmail: e.target.value })} />
          <TextField label="City" value={ownerForm.city} onChange={(e) => setOwnerForm((f) => f && { ...f, city: e.target.value })} />
          <TextField
            label="Link (slug)"
            value={ownerForm.slug}
            onChange={(e) => setOwnerForm((f) => f && { ...f, slug: e.target.value })}
            hint="The old link keeps redirecting here."
          />
          <TextField label="Restaurant name" value={ownerForm.name} onChange={(e) => setOwnerForm((f) => f && { ...f, name: e.target.value })} />
        </div>
        <TextArea label="Notes" rows={3} value={ownerForm.notes} onChange={(e) => setOwnerForm((f) => f && { ...f, notes: e.target.value })} />

        <div className="flex flex-col gap-2 rounded-[14px] border border-dashed border-border p-3.5">
          <p className="text-[13px] font-bold text-text-muted">Owner login on jamavat.com</p>
          <div className="flex flex-wrap items-end gap-3">
            <TextField
              label="Username"
              className="min-w-[200px] flex-1"
              value={ownerForm.ownerUsername}
              onChange={(e) => setOwnerForm((f) => f && { ...f, ownerUsername: e.target.value })}
              hint="Letters, numbers, dots, dashes — or they can sign in with their email instead."
              autoComplete="off"
            />
            <Button variant="secondary" size="md" onClick={() => setSettingPassword(true)}>
              {restaurant.hasOwnerLogin ? "Change password" : "Set a password"}
            </Button>
          </div>
          <p className="text-[13px] text-text-muted">{restaurant.hasOwnerLogin ? "A password is set — the owner can sign in at jamavat.com/login." : "No password set yet — the owner login is off until one is set."}</p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-dashed border-border pt-3">
          {ownerSaved && !ownerDirty ? <span className="text-[13px] font-bold text-green-700">Saved</span> : null}
          <Button size="md" onClick={saveOwner} disabled={!ownerDirty || ownerBusy}>
            {ownerBusy ? "Saving…" : "Save"}
          </Button>
        </div>
        {ownerError ? <Alert>{ownerError}</Alert> : null}
      </Card>

      <ReportCard id={id} restaurantName={restaurant.name} />

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-[15px] text-text-muted">Nothing recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-border pb-2 text-[15px]">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{rupees(payment.amount)}</span>
                  <span className="text-text-muted">
                    {payment.method} · {payment.months} month{payment.months > 1 ? "s" : ""} · {formatDate(payment.paidAt)}
                  </span>
                  <span className="text-text-muted">until {formatDate(payment.paidUntil)}</span>
                  {payment.note ? <span className="text-text-muted">{payment.note}</span> : null}
                </span>
                <span className="flex items-center gap-1">
                  <IconButton label="Edit payment" size="sm" onClick={() => setEditingPayment(payment)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </IconButton>
                  <IconButton label="Delete payment" size="sm" danger onClick={() => setDeletingPayment(payment)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                    </svg>
                  </IconButton>
                </span>
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

      <EditPayment
        payment={editingPayment}
        restaurantId={id}
        onClose={() => setEditingPayment(null)}
        onSaved={() => {
          setEditingPayment(null);
          void load();
        }}
      />

      <ConfirmDialog
        open={deletingPayment !== null}
        title={deletingPayment ? `Delete the ${rupees(deletingPayment.amount)} payment?` : ""}
        description="This recalculates the restaurant's paid-until date from what's left."
        confirmLabel="Delete payment"
        onConfirm={async () => {
          const payment = deletingPayment;
          setDeletingPayment(null);
          if (!payment) return;
          await fetch(`/api/hq/restaurants/${id}/payments/${payment.id}`, { method: "DELETE" }).catch(() => null);
          void load();
        }}
        onCancel={() => setDeletingPayment(null)}
      />

      <SetOwnerPassword
        open={settingPassword}
        restaurantId={id}
        onClose={() => setSettingPassword(false)}
        onSaved={() => {
          setSettingPassword(false);
          void load();
        }}
      />

      <DeleteRestaurantDialog
        restaurant={deleting ? { id, name: restaurant.name } : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/hq");
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
        <p className="text-[15px] text-text-muted">This moves their period forward — from the current end if it hasn&apos;t passed, otherwise from today. A receipt is emailed to the owner if their email is on file.</p>
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

function EditPayment({
  payment,
  restaurantId,
  onClose,
  onSaved,
}: {
  payment: SubscriptionPaymentDTO | null;
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ amount: "", method: "UPI", months: "1", paidAt: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payment) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- loading a fresh payment into the edit form
      setForm({ amount: String(payment.amount), method: payment.method, months: String(payment.months), paidAt: payment.paidAt.slice(0, 10), note: payment.note ?? "" });
      setError(null);
    }
  }, [payment]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!payment) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/hq/restaurants/${restaurantId}/payments/${payment.id}`, {
        method: "PATCH",
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
      if (!res.ok) throw new Error(data?.error ?? "Couldn't save that payment");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that payment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={payment !== null} onClose={onClose} title="Edit payment">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <p className="text-[15px] text-text-muted">The restaurant&apos;s paid-until date is recalculated from every payment, in order, after this is saved.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Amount (₹)" type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
          <Select
            label="Paid by"
            value={form.method}
            onChange={(value) => setForm((f) => ({ ...f, method: value }))}
            options={SUBSCRIPTION_PAYMENT_METHODS.map((method) => ({ value: method, label: method.charAt(0) + method.slice(1).toLowerCase() }))}
          />
          <TextField label="Months" type="number" min={1} max={36} value={form.months} onChange={(e) => setForm((f) => ({ ...f, months: e.target.value }))} />
          <TextField label="Paid on" type="date" value={form.paidAt} onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))} />
        </div>
        <TextField label="Note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Saving…" : "Save payment"}
        </Button>
      </form>
    </Modal>
  );
}

function SetOwnerPassword({ open, restaurantId, onClose, onSaved }: { open: boolean; restaurantId: string; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setPassword("");
    setError(null);
    onClose();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/hq/restaurants/${restaurantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerPassword: password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't set that password");
      setPassword("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set that password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Set the owner's password" size="sm">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <p className="text-[15px] text-text-muted">For jamavat.com/login. Tell the owner directly — it isn&apos;t emailed.</p>
        <TextField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 6 characters." autoComplete="new-password" minLength={6} required />
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" disabled={busy || password.length < 6}>
          {busy ? "Saving…" : "Save password"}
        </Button>
      </form>
    </Modal>
  );
}

function ReportCard({ id, restaurantName }: { id: string; restaurantName: string }) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-extrabold">Report</h2>
      <p className="text-[15px] text-text-muted">Download {restaurantName}&apos;s orders and sales for any date range, as a CSV.</p>
      <div className="flex flex-wrap items-end gap-3">
        <TextField label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="To" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
        <IconButton label="Download CSV report" href={`/api/hq/restaurants/${id}/report?from=${from}&to=${to}`} download size="md">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
          </svg>
        </IconButton>
      </div>
    </Card>
  );
}
