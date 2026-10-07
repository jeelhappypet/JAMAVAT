"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PIN_PATTERN } from "@/lib/auth/constants";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { RoutingMatrix } from "@/components/staff/RoutingMatrix";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { STAFF_ROLES, type MenuDTO, type StaffDTO, type StaffRole } from "@/types";

const inputClass = "h-12 w-full rounded-xl border border-stone-300 bg-surface px-3.5 text-base font-normal";
const labelClass = "flex flex-col gap-1.5 text-sm font-bold";
const smallButton = "h-10 rounded-[10px] border border-stone-300 bg-surface px-3.5 text-sm font-bold active:bg-surface-muted";

type PendingAction =
  | { kind: "role"; staff: StaffDTO; role: StaffRole }
  | { kind: "deactivate"; staff: StaffDTO }
  | { kind: "logout"; staff: StaffDTO };

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 4);

export function StaffManager({ currentStaffId }: { currentStaffId: string }) {
  const { t } = useI18n();
  const [staff, setStaff] = useState<StaffDTO[]>([]);
  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("KITCHEN");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function toggleRouting(member: StaffDTO, categoryId: string) {
    const next = member.categoryIds.includes(categoryId)
      ? member.categoryIds.filter((id) => id !== categoryId)
      : [...member.categoryIds, categoryId];
    // Optimistic: the tick moves at once; a failed save puts it back.
    setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, categoryIds: next } : s)));
    if (!(await update(member.id, { categoryIds: next }))) {
      setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, categoryIds: member.categoryIds } : s)));
    }
  }

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
    return true;
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
    if (action.kind === "deactivate") await update(action.staff.id, { isActive: false });
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

  const confirmCopy = pending
    ? pending.kind === "role"
      ? {
          title: t("staff.confirmRoleTitle", { name: pending.staff.name, role: t(`role.${pending.role}`) }),
          description: t("staff.confirmRoleDesc"),
          confirmLabel: t("staff.confirmRoleAction"),
          variant: "primary" as const,
        }
      : pending.kind === "deactivate"
        ? {
            title: t("staff.confirmDeactivateTitle", { name: pending.staff.name }),
            description: t("staff.confirmDeactivateDesc"),
            confirmLabel: t("staff.deactivate"),
            variant: "danger" as const,
          }
        : {
            title: t("staff.confirmLogoutTitle", { name: pending.staff.name }),
            description: t("staff.confirmLogoutDesc"),
            confirmLabel: t("staff.logoutDevices"),
            variant: "danger" as const,
          }
    : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex max-w-[680px] flex-col gap-1.5">
          <h1 className="text-[26px] font-extrabold tracking-tight">{t("staff.title")}</h1>
          <p className="text-[15px] leading-relaxed text-text-muted">{t("staff.subtitle")}</p>
        </div>
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-[46px] items-center gap-2 rounded-xl bg-brand px-[18px] text-[15px] font-extrabold text-white active:bg-brand-dark"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("staff.add")}
          </button>
        ) : null}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-[18px]">
          <h2 className="text-[17px] font-extrabold">{t("staff.add")}</h2>
          <div className="grid gap-3.5 sm:grid-cols-[2fr_1fr_1fr]">
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
          </div>
          <p className="text-[13px] text-text-muted">{t("staff.firstPinHint")}</p>
          <div className="flex flex-wrap gap-2.5">
            <button type="submit" disabled={saving} className="h-[46px] rounded-xl bg-brand px-[18px] text-[15px] font-extrabold text-white disabled:opacity-60">
              {saving ? t("staff.adding") : t("staff.add")}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="h-[46px] rounded-xl border border-stone-300 bg-surface px-[18px] text-[15px] font-bold">
              {t("common.cancel")}
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[18px] border border-border bg-surface">
        <div className="flex items-center justify-between gap-2.5 border-b border-border px-[18px] py-4">
          <h2 className="text-[17px] font-extrabold">{t("staff.team")}</h2>
          {!loading ? <span className="text-[13px] text-text-muted">{t("staff.count", { n: staff.length })}</span> : null}
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <ul>
            {staff.map((s) => {
              const isMe = s.id === currentStaffId;
              return (
                <li
                  key={s.id}
                  className={`flex min-h-16 flex-wrap items-center gap-x-4 gap-y-3 border-b border-stone-100 px-[18px] py-3 last:border-b-0 ${
                    s.isActive ? "" : "bg-surface-muted"
                  }`}
                >
                  <div className="flex min-w-0 flex-[1_1_220px] items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-200 text-sm font-extrabold">
                      {s.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-bold">{s.name}</span>
                      <span className="flex flex-wrap gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            s.role === "ADMIN" ? "bg-stone-200 text-stone-900" : "bg-brand-light text-brand-dark"
                          }`}
                        >
                          {t(`role.${s.role}`)}
                        </span>
                        {isMe ? <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{t("staff.you")}</span> : null}
                        {!s.isActive ? <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-700">{t("staff.inactive")}</span> : null}
                        {s.isLocked ? <span className="rounded-full bg-danger-light px-2 py-0.5 text-[11px] font-bold text-red-900">{t("staff.locked")}</span> : null}
                      </span>
                    </span>
                  </div>

                  <label className="sr-only" htmlFor={`role-${s.id}`}>
                    {t("staff.roleFor", { name: s.name })}
                  </label>
                  <select
                    id={`role-${s.id}`}
                    value={s.role}
                    disabled={!s.isActive}
                    onChange={(e) => setPending({ kind: "role", staff: s, role: e.target.value as StaffRole })}
                    className="h-10 rounded-[10px] border border-stone-300 bg-surface px-3 text-sm font-semibold disabled:opacity-60"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t(`role.${r}`)}
                      </option>
                    ))}
                  </select>

                  <div className="flex flex-wrap gap-2">
                    {s.isActive ? (
                      <>
                        <button type="button" className={smallButton} onClick={() => setResetTarget(s)}>
                          {t("staff.resetPin")}
                        </button>
                        <button type="button" className={smallButton} onClick={() => setPending({ kind: "logout", staff: s })}>
                          {t("staff.logoutDevices")}
                        </button>
                        <button type="button" className={`${smallButton} text-danger`} onClick={() => setPending({ kind: "deactivate", staff: s })}>
                          {t("staff.deactivate")}
                        </button>
                      </>
                    ) : (
                      <button type="button" className={smallButton} onClick={() => update(s.id, { isActive: true })}>
                        {t("staff.activate")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!loading ? <RoutingMatrix staff={staff} menus={menus} onToggle={toggleRouting} /> : null}

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
