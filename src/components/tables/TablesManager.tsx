"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { SeatDTO, TableDTO } from "@/types";

type Pending =
  | { kind: "regenerate"; seat: SeatDTO }
  | { kind: "deleteSeat"; seat: SeatDTO }
  | { kind: "deleteTable"; table: TableDTO };

const iconButton =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-stone-300 bg-surface text-stone-700 active:bg-surface-muted disabled:opacity-35";
const inputClass = "h-12 w-full rounded-xl border border-stone-300 bg-surface px-3.5 text-base font-normal";

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  regenerate: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  open: "M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1",
};

export function TablesManager() {
  const { t } = useI18n();
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [form, setForm] = useState<{ mode: "create" | "edit"; table?: TableDTO } | null>(null);
  const [qrVersion, setQrVersion] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tables");
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      setTables(data.tables);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("err.tablesLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  // Seat locks change as guests order and the counter frees QRs.
  useRealtime({ [REALTIME_EVENTS.SEAT_UPDATED]: load }, load);

  async function send(method: string, url: string, body?: unknown): Promise<string | null> {
    setError(null);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (redirectToLoginIfUnauthorized(res)) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) return data?.error ?? t("err.saveFailed");
    await load();
    return null;
  }

  async function act(method: string, url: string, body?: unknown) {
    const message = await send(method, url, body);
    if (message) setError(message);
  }

  async function confirmPending() {
    if (!pending) return;
    const action = pending;
    setPending(null);
    if (action.kind === "regenerate") {
      await act("PATCH", `/api/seats/${action.seat.id}`, { regenerate: true });
      setQrVersion((v) => v + 1);
    }
    if (action.kind === "deleteSeat") await act("DELETE", `/api/seats/${action.seat.id}`);
    if (action.kind === "deleteTable") await act("DELETE", `/api/tables/${action.table.id}`);
  }

  const confirmCopy = pending
    ? pending.kind === "regenerate"
      ? { title: t("tables.regenerateTitle", { code: pending.seat.code }), description: t("tables.regenerateDesc"), confirmLabel: t("tables.regenerateAction"), variant: "primary" as const }
      : pending.kind === "deleteSeat"
        ? { title: t("tables.deleteSeatTitle", { code: pending.seat.code }), description: t("tables.deleteDesc"), confirmLabel: t("menu.delete"), variant: "danger" as const }
        : { title: t("tables.deleteTitle", { name: pending.table.name }), description: t("tables.deleteDesc"), confirmLabel: t("menu.delete"), variant: "danger" as const }
    : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex max-w-[720px] flex-col gap-1.5">
          <h1 className="text-[26px] font-extrabold tracking-tight">{t("tables.title")}</h1>
          <p className="text-[15px] leading-relaxed text-text-muted">{t("tables.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tables.length > 0 ? (
            <Link href="/tables/print" className="flex h-[46px] items-center rounded-xl border border-stone-300 bg-surface px-4 text-[15px] font-bold">
              {t("tables.printAll")}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setForm({ mode: "create" })}
            className="flex h-[46px] items-center gap-2 rounded-xl bg-brand px-[18px] text-[15px] font-extrabold text-white active:bg-brand-dark"
          >
            + {t("tables.add")}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
          {error}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}
      {!loading && tables.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-stone-300 bg-surface px-6 py-12 text-center text-[15px] text-text-muted">{t("tables.empty")}</div>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
        {tables.map((table) => {
          const anyInUse = table.seats.some((seat) => seat.session);
          return (
            <section key={table.id} className={`flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3.5 ${table.isActive ? "" : "opacity-70"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-extrabold">{t("tables.table", { name: table.name })}</span>
                  {table.area || !table.isActive ? (
                    <span className="text-xs font-semibold text-text-muted">{[table.area, table.isActive ? undefined : t("tables.hidden")].filter(Boolean).join(" · ")}</span>
                  ) : null}
                </div>
                <div className="flex gap-1.5">
                  <button type="button" className="h-10 rounded-[10px] border border-dashed border-stone-400 bg-surface px-2.5 text-[13px] font-bold text-stone-700" onClick={() => act("POST", `/api/tables/${table.id}/seats`)}>
                    {t("tables.addQr")}
                  </button>
                  <button type="button" className={iconButton} aria-label={t("tables.editTable")} title={t("tables.editTable")} onClick={() => setForm({ mode: "edit", table })}>
                    <Icon d={ICONS.edit} />
                  </button>
                  <button type="button" className={iconButton} aria-label={table.isActive ? t("menu.hide") : t("menu.show")} title={table.isActive ? t("menu.hide") : t("menu.show")} onClick={() => act("PATCH", `/api/tables/${table.id}`, { isActive: !table.isActive })}>
                    <Icon d={table.isActive ? ICONS.eyeOff : ICONS.eye} />
                  </button>
                  <button type="button" className={`${iconButton} text-danger`} disabled={anyInUse} aria-label={t("tables.deleteTable")} title={t("tables.deleteTable")} onClick={() => setPending({ kind: "deleteTable", table })}>
                    <Icon d={ICONS.trash} />
                  </button>
                </div>
              </div>

              {table.seats.map((seat) => (
                <div key={seat.id} className="flex items-center gap-2.5 rounded-xl bg-surface-muted p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- server-generated SVG, no optimisation needed */}
                  <img src={`/api/seats/${seat.id}/qr?v=${qrVersion}`} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg border border-border bg-white" />
                  <span className="flex min-w-0 flex-grow flex-col">
                    <span className="text-[15px] font-extrabold">{seat.code}</span>
                    {seat.session ? (
                      <span className="truncate text-xs font-semibold text-brand-dark">
                        {t("tables.inUse")} · {seat.session.email}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-text-muted">{t("tables.free")}</span>
                    )}
                  </span>
                  <a href={`/api/seats/${seat.id}/qr`} download className={iconButton} aria-label={t("tables.download", { code: seat.code })} title={t("tables.download", { code: seat.code })}>
                    <Icon d={ICONS.download} />
                  </a>
                  <a href={`/t/${seat.token}`} target="_blank" rel="noreferrer" className={iconButton} aria-label={t("tables.open", { code: seat.code })} title={t("tables.open", { code: seat.code })}>
                    <Icon d={ICONS.open} />
                  </a>
                  <button type="button" className={iconButton} aria-label={t("tables.regenerate", { code: seat.code })} title={t("tables.regenerate", { code: seat.code })} onClick={() => setPending({ kind: "regenerate", seat })}>
                    <Icon d={ICONS.regenerate} />
                  </button>
                  {table.seats.length > 1 ? (
                    <button type="button" className={`${iconButton} text-danger`} disabled={!!seat.session} aria-label={t("tables.deleteSeat", { code: seat.code })} title={t("tables.deleteSeat", { code: seat.code })} onClick={() => setPending({ kind: "deleteSeat", seat })}>
                      <Icon d={ICONS.trash} />
                    </button>
                  ) : null}
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {form ? <TableForm mode={form.mode} table={form.table} onClose={() => setForm(null)} send={send} /> : null}

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
    </>
  );
}

function TableForm({
  mode,
  table,
  onClose,
  send,
}: {
  mode: "create" | "edit";
  table?: TableDTO;
  onClose: () => void;
  send: (method: string, url: string, body?: unknown) => Promise<string | null>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(table?.name ?? "");
  const [area, setArea] = useState(table?.area ?? "");
  const [seats, setSeats] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t("err.enterName"));
    setSaving(true);
    const message =
      mode === "create"
        ? await send("POST", "/api/tables", { name: name.trim(), area: area.trim(), seats })
        : await send("PATCH", `/api/tables/${table!.id}`, { name: name.trim(), area: area.trim() });
    setSaving(false);
    if (message) setError(message);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="table-form-title">
      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4 rounded-[20px] bg-surface p-6 shadow-lg">
        <h2 id="table-form-title" className="text-xl font-extrabold">
          {mode === "create" ? t("tables.add") : t("tables.editTable")}
        </h2>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          {t("tables.name")}
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="4" autoFocus />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          {t("tables.area")}
          <input type="text" value={area} onChange={(e) => setArea(e.target.value)} className={inputClass} />
          <span className="text-[13px] font-normal text-text-muted">{t("tables.areaHint")}</span>
        </label>
        {mode === "create" ? (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-bold">{t("tables.seats")}</legend>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={seats === count}
                  onClick={() => setSeats(count)}
                  className={`h-12 rounded-xl text-base font-extrabold ${seats === count ? "border-2 border-brand bg-orange-50 text-brand-dark" : "border border-stone-300 bg-surface"}`}
                >
                  {count}
                </button>
              ))}
            </div>
            <span className="text-[13px] text-text-muted">
              {(name.trim() || "4") + ["A", "B", "C", "D"].slice(0, seats).join(", " + (name.trim() || "4"))}
            </span>
          </fieldset>
        ) : null}
        {error ? (
          <p role="alert" className="font-semibold text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-2 flex gap-3">
          <button type="button" onClick={onClose} className="h-12 flex-1 rounded-xl border border-stone-300 bg-surface text-base font-bold">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={saving} className="h-12 flex-1 rounded-xl bg-brand text-base font-extrabold text-white disabled:opacity-60">
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
