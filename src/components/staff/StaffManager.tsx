"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PIN_PATTERN } from "@/lib/auth/constants";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import { RoutingMatrix, routingColumns } from "@/components/staff/RoutingMatrix";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { STAFF_ROLES, type MenuDTO, type StaffDTO, type StaffRole } from "@/types";

const inputClass = "h-12 w-full rounded-xl border border-stone-300 bg-surface px-3.5 text-base font-normal";
const labelClass = "flex flex-col gap-1.5 text-sm font-bold";
const actionButton = "flex h-12 w-full items-center justify-center rounded-xl border border-stone-300 bg-surface text-[15px] font-bold";

type PendingAction =
  | { kind: "role"; staff: StaffDTO; role: StaffRole }
  | { kind: "deactivate"; staff: StaffDTO }
  | { kind: "logout"; staff: StaffDTO };

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 4);

/** "Admin · staff & category routing" artboard: one grid of logins × categories, plus who-gets-what preview. */
export function StaffManager({ currentStaffId }: { currentStaffId: string }) {
  const { t, lang } = useI18n();
  const [staff, setStaff] = useState<StaffDTO[]>([]);
  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("KITCHEN");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<StaffDTO | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffDTO | null>(null);
  const [resetPin, setResetPin] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      setStaff(data.staff);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("err.staffLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadMenus = useCallback(async () => {
    const res = await fetch("/api/menu");
    if (redirectToLoginIfUnauthorized(res)) return;
    const data = await res.json().catch(() => null);
    if (res.ok) setMenus(data.menus);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    void loadMenus();
  }, [load, loadMenus]);

  // New categories from the Menu page show up as matrix columns without a reload.
  useRealtime({ [REALTIME_EVENTS.MENU_UPDATED]: loadMenus });

  async function update(id: string, body: Record<string, unknown>): Promise<boolean> {
    setError(null);
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (redirectToLoginIfUnauthorized(res)) return false;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? t("err.staffUpdate"));
      return false;
    }
    setStaff((prev) => prev.map((s) => (s.id === id ? data.staff : s)));
    setEditing((prev) => (prev?.id === id ? data.staff : prev));
    return true;
  }

  async function toggleRouting(member: StaffDTO, categoryId: string) {
    const next = member.categoryIds.includes(categoryId) ? member.categoryIds.filter((id) => id !== categoryId) : [...member.categoryIds, categoryId];
    // Optimistic: the tick moves at once; a failed save puts it back.
    setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, categoryIds: next } : s)));
    if (!(await update(member.id, { categoryIds: next }))) {
      setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, categoryIds: member.categoryIds } : s)));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t("err.enterName"));
    if (!PIN_PATTERN.test(pin)) return setError(t("err.pinFormat"));
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, pin }),
      });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("err.staffAdd"));
      setStaff((prev) => [...prev, data.staff]);
      setName("");
      setPin("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.staffAdd"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmPending() {
    if (!pending) return;
    const action = pending;
    setPending(null);
    if (action.kind === "role") await update(action.staff.id, { role: action.role });
    if (action.kind === "deactivate" && (await update(action.staff.id, { isActive: false }))) setEditing(null);
    if (action.kind === "logout") await update(action.staff.id, { logoutEverywhere: true });
  }

  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    if (!PIN_PATTERN.test(resetPin)) return setError(t("err.pinFormat"));
    if (await update(resetTarget.id, { pin: resetPin })) {
      setResetTarget(null);
      setResetPin("");
    }
  }

  const active = staff.filter((member) => member.isActive);
  const inactive = staff.filter((member) => !member.isActive);
  const kitchens = active.filter((member) => member.role === "KITCHEN");
  const { columns } = routingColumns(menus);
  const gaps = columns.filter(({ category }) => !kitchens.some((member) => member.categoryIds.includes(category.id)));

  // "Try it": a few dishes taken from each menu in turn, as if one table ordered from every kitchen.
  const perMenu = new Map<string, { category: (typeof columns)[number]["category"]; item: (typeof columns)[number]["category"]["items"][number] }[]>();
  for (const { category, menu } of columns) {
    const item = category.items.find((entry) => entry.isActive);
    if (item) perMenu.set(menu.id, [...(perMenu.get(menu.id) ?? []), { category, item }]);
  }
  const queues = [...perMenu.values()];
  const sample: { category: (typeof columns)[number]["category"]; item: (typeof columns)[number]["category"]["items"][number]; qty: number }[] = [];
  for (let round = 0; sample.length < 4 && queues.some((queue) => queue.length > round); round++) {
    for (const queue of queues) if (queue[round] && sample.length < 4) sample.push({ ...queue[round], qty: sample.length % 2 === 0 ? 1 : 2 });
  }

  const confirmCopy = pending
    ? pending.kind === "role"
      ? { title: t("staff.confirmRoleTitle", { name: pending.staff.name, role: t(`role.${pending.role}`) }), description: t("staff.confirmRoleDesc"), confirmLabel: t("staff.confirmRoleAction"), variant: "primary" as const }
      : pending.kind === "deactivate"
        ? { title: t("staff.confirmDeactivateTitle", { name: pending.staff.name }), description: t("staff.confirmDeactivateDesc"), confirmLabel: t("staff.deactivate"), variant: "danger" as const }
        : { title: t("staff.confirmLogoutTitle", { name: pending.staff.name }), description: t("staff.confirmLogoutDesc"), confirmLabel: t("staff.logoutDevices"), variant: "danger" as const }
    : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex max-w-[680px] flex-col gap-1.5">
          <h1 className="text-[26px] font-extrabold tracking-tight">{t("routing.title")}</h1>
          <p className="text-[15px] leading-relaxed text-text-muted">{t("routing.subtitle")}</p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="flex h-[46px] items-center gap-2 rounded-xl bg-brand px-[18px] text-[15px] font-extrabold text-white active:bg-brand-dark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("staff.add")}
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {columns.length === 0 ? <Note tone="info">{t("routing.noCategories")}</Note> : null}
          <RoutingMatrix staff={active} menus={menus} currentStaffId={currentStaffId} onToggle={toggleRouting} onEdit={setEditing} />

          {columns.length > 0 ? (
            kitchens.length === 0 ? (
              <Note tone="info">{t("routing.noKitchen")}</Note>
            ) : gaps.length > 0 ? (
              <Note tone="warn">{t("routing.gap", { names: gaps.map(({ category }) => localName(lang, category.name, category.nameGu)).join(", ") })}</Note>
            ) : (
              <Note tone="ok">{t("routing.ok")}</Note>
            )
          ) : null}

          {kitchens.length > 0 && sample.length > 0 ? (
            <section className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-[18px]">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-[17px] font-extrabold">{t("routing.tryTitle")}</h2>
                <span className="text-[13px] text-text-muted">{t("routing.tryHint")}</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2.5">
                {kitchens.map((member) => {
                  const got = sample.filter(({ category }) => member.categoryIds.includes(category.id)).map(({ item, qty }) => `${localName(lang, item.name, item.nameGu)} × ${qty}`);
                  return (
                    <div key={member.id} className="flex flex-col gap-1 rounded-[14px] border border-border bg-stone-50 p-3.5">
                      <span className="text-sm font-extrabold">
                        {member.name} <span className="font-semibold text-text-muted">· {t(`role.${member.role}`)}</span>
                      </span>
                      <span className={`text-sm leading-relaxed ${got.length ? "text-foreground" : "text-text-muted"}`}>{got.length ? got.join(", ") : t("routing.tryNothing")}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {inactive.length > 0 ? (
            <section className="flex flex-col gap-2 rounded-[18px] border border-border bg-surface p-[18px]">
              <h2 className="text-[17px] font-extrabold">{t("staff.inactiveTitle")}</h2>
              {inactive.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 border-t border-stone-100 pt-2">
                  <span className="text-[15px] font-semibold text-text-muted">
                    {member.name} · {t(`role.${member.role}`)}
                  </span>
                  <button type="button" onClick={() => update(member.id, { isActive: true })} className="h-10 rounded-[10px] border border-stone-300 bg-surface px-3.5 text-sm font-bold">
                    {t("staff.activate")}
                  </button>
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}

      {adding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-staff-title">
          <form onSubmit={handleAdd} className="flex w-full max-w-md flex-col gap-3.5 rounded-[20px] bg-surface p-6 shadow-lg">
            <h2 id="add-staff-title" className="text-xl font-extrabold">
              {t("staff.add")}
            </h2>
            <label className={labelClass}>
              {t("staff.name")}
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
            </label>
            <label className={labelClass}>
              {t("staff.role")}
              <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={inputClass}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              {t("staff.firstPin")}
              <input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(digitsOnly(e.target.value))} className={`${inputClass} text-center tracking-[0.4em]`} />
            </label>
            <p className="text-[13px] text-text-muted">{t("staff.firstPinHint")}</p>
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={() => setAdding(false)} className="h-12 flex-1 rounded-xl border border-stone-300 bg-surface text-base font-bold">
                {t("common.cancel")}
              </button>
              <button type="submit" disabled={saving} className="h-12 flex-1 rounded-xl bg-brand text-base font-extrabold text-white disabled:opacity-60">
                {saving ? t("staff.adding") : t("staff.add")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editing && !pending && !resetTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-staff-title">
          <div className="flex w-full max-w-md flex-col gap-3.5 rounded-[20px] bg-surface p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-200 text-base font-extrabold">{editing.name.charAt(0).toUpperCase()}</span>
              <h2 id="edit-staff-title" className="text-xl font-extrabold">
                {editing.name}
              </h2>
            </div>
            <label className={labelClass}>
              {t("staff.role")}
              <select
                value={editing.role}
                onChange={(e) => setPending({ kind: "role", staff: editing, role: e.target.value as StaffRole })}
                className={inputClass}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}`)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={actionButton} onClick={() => setResetTarget(editing)}>
              {t("staff.resetPin")}
            </button>
            <button type="button" className={actionButton} onClick={() => setPending({ kind: "logout", staff: editing })}>
              {t("staff.logoutDevices")}
            </button>
            {editing.id !== currentStaffId ? (
              <button type="button" className={`${actionButton} text-danger`} onClick={() => setPending({ kind: "deactivate", staff: editing })}>
                {t("staff.deactivate")}
              </button>
            ) : null}
            <button type="button" onClick={() => setEditing(null)} className="mt-1 h-12 rounded-xl bg-stone-900 text-base font-extrabold text-white">
              {t("common.done")}
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmCopy !== null}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description}
        confirmLabel={confirmCopy?.confirmLabel}
        cancelLabel={t("common.cancel")}
        variant={confirmCopy?.variant}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />

      {resetTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-pin-title">
          <form onSubmit={handleResetPin} className="w-full max-w-sm rounded-[20px] bg-surface p-6 shadow-lg">
            <h2 id="reset-pin-title" className="text-xl font-extrabold">
              {t("staff.resetTitle", { name: resetTarget.name })}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-text-muted">{t("staff.resetDesc")}</p>
            <label className="mt-4 flex flex-col gap-1.5 text-sm font-bold">
              {t("staff.newPin")}
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={resetPin}
                onChange={(e) => setResetPin(digitsOnly(e.target.value))}
                className={`${inputClass} text-center text-xl tracking-[0.5em]`}
                autoFocus
              />
            </label>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="h-12 flex-1 rounded-xl border border-stone-300 bg-surface text-base font-bold"
                onClick={() => {
                  setResetTarget(null);
                  setResetPin("");
                }}
              >
                {t("common.cancel")}
              </button>
              <button type="submit" className="h-12 flex-1 rounded-xl bg-brand text-base font-extrabold text-white">
                {t("staff.savePin")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Note({ tone, children }: { tone: "ok" | "warn" | "info"; children: React.ReactNode }) {
  const styles = {
    ok: "bg-success-light text-green-900",
    warn: "bg-danger-light text-red-900",
    info: "border border-border bg-surface text-stone-700",
  }[tone];
  const icon =
    tone === "ok" ? (
      <path d="M5 13l4 4L19 7" />
    ) : tone === "warn" ? (
      <>
        <path d="M12 3 2 20h20L12 3Z" />
        <path d="M12 10v4M12 17h.01" />
      </>
    ) : (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v5h1" />
      </>
    );
  return (
    <div className={`flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-sm font-semibold leading-relaxed ${styles}`}>
      <svg className="mt-0.5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {icon}
      </svg>
      <span>{children}</span>
    </div>
  );
}
