"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { PIN_PATTERN } from "@/lib/auth/constants";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import { RoutingMatrix, routingColumns } from "@/components/staff/RoutingMatrix";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { STAFF_ROLES, type MenuDTO, type StaffDTO, type StaffRole } from "@/types";


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
        <Button
          size="lg"
          onClick={() => setAdding(true)}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        >
          {t("staff.add")}
        </Button>
      </div>

      {error ? <Alert>{error}</Alert> : null}

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
                  <Button variant="secondary" size="sm" onClick={() => update(member.id, { isActive: true })}>
                    {t("staff.activate")}
                  </Button>
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}

      <Modal
        open={adding}
        title={t("staff.add")}
        onClose={() => setAdding(false)}
        onSubmit={handleAdd}
        footer={
          <>
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={saving}>
              {saving ? t("staff.adding") : t("staff.add")}
            </Button>
          </>
        }
      >
        <TextField label={t("staff.name")} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Select label={t("staff.role")} value={role} onChange={(value) => setRole(value as StaffRole)} options={STAFF_ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))} />
        <TextField
          label={t("staff.firstPin")}
          hint={t("staff.firstPinHint")}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(digitsOnly(e.target.value))}
          inputClassName="text-center tracking-[0.4em]"
        />
      </Modal>

      <Modal
        open={editing !== null && !pending && !resetTarget}
        title={editing?.name ?? ""}
        onClose={() => setEditing(null)}
        footer={
          <Button variant="dark" size="lg" fullWidth onClick={() => setEditing(null)}>
            {t("common.done")}
          </Button>
        }
      >
        {editing ? (
          <>
            <Select label={t("staff.role")} value={editing.role} onChange={(value) => setPending({ kind: "role", staff: editing, role: value as StaffRole })} options={STAFF_ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))} />
            <Button variant="secondary" size="lg" fullWidth onClick={() => setResetTarget(editing)}>
              {t("staff.resetPin")}
            </Button>
            <Button variant="secondary" size="lg" fullWidth onClick={() => setPending({ kind: "logout", staff: editing })}>
              {t("staff.logoutDevices")}
            </Button>
            {editing.id !== currentStaffId ? (
              <Button variant="danger" size="lg" fullWidth onClick={() => setPending({ kind: "deactivate", staff: editing })}>
                {t("staff.deactivate")}
              </Button>
            ) : null}
          </>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmCopy !== null}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description}
        confirmLabel={confirmCopy?.confirmLabel}
        variant={confirmCopy?.variant}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />

      <Modal
        open={resetTarget !== null}
        size="sm"
        title={resetTarget ? t("staff.resetTitle", { name: resetTarget.name }) : ""}
        onClose={() => {
          setResetTarget(null);
          setResetPin("");
        }}
        onSubmit={handleResetPin}
        footer={
          <>
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => {
                setResetTarget(null);
                setResetPin("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="lg" className="flex-1">
              {t("staff.savePin")}
            </Button>
          </>
        }
      >
        <p className="-mt-2 text-[15px] leading-relaxed text-text-muted">{t("staff.resetDesc")}</p>
        <TextField
          label={t("staff.newPin")}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={resetPin}
          onChange={(e) => setResetPin(digitsOnly(e.target.value))}
          inputClassName="text-center text-xl tracking-[0.5em]"
          autoFocus
        />
      </Modal>
    </>
  );
}

/** Routing check under the grid — the Alert tones with an icon in front. */
function Note({ tone, children }: { tone: "ok" | "warn" | "info"; children: React.ReactNode }) {
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
    <Alert tone={tone === "ok" ? "success" : tone === "warn" ? "error" : "info"}>
      <span className="flex items-start gap-2.5">
        <svg className="mt-0.5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icon}
        </svg>
        <span>{children}</span>
      </span>
    </Alert>
  );
}
