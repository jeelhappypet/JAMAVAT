"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { TableDTO } from "@/types";

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * "New table order": the counter picks a table and orders for it straight
 * away — no email, no OTP. A free table opens a new sitting (its QR then
 * shows "in use" to anyone who scans it); a table in use adds to its bill.
 * The tables are fetched only when the dialog opens.
 */
export function TablePickerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [tables, setTables] = useState<TableDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tables");
        if (redirectToLoginIfUnauthorized(res)) return;
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error);
        if (!cancelled) setTables(data.tables);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error && err.message ? err.message : t("err.ordersLoad"));
      }
    })();
    return () => {
      cancelled = true;
      setTables(null);
      setError(null);
    };
  }, [open, t]);

  const active = (tables ?? [])
    .filter((table) => table.isActive)
    .map((table) => ({ ...table, seats: table.seats.filter((seat) => seat.isActive) }))
    .filter((table) => table.seats.length > 0);

  return (
    <Modal
      open={open}
      title={t("counter.pickTable")}
      onClose={onClose}
      footer={
        <Button variant="secondary" fullWidth onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <p className="text-sm leading-relaxed text-text-muted">{t("counter.pickTableHint")}</p>
      {error ? <Alert>{error}</Alert> : null}
      {tables === null && !error ? (
        <SkeletonList rows={4} header={false} />
      ) : tables !== null && active.length === 0 ? (
        <EmptyState title={t("counter.noTables")} />
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((table) => (
            <div key={table.id} className="flex flex-col gap-2">
              <span className="text-sm font-bold text-text-muted">
                {t("tables.table", { name: table.name })}
                {table.area ? ` · ${table.area}` : ""}
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {table.seats.map((seat) => (
                  <Link
                    key={seat.id}
                    href={`/new-order?seat=${seat.id}`}
                    onClick={onClose}
                    className={`flex min-h-[84px] flex-col justify-between gap-2 rounded-[14px] border-[1.5px] p-3 text-left transition-colors ${
                      seat.session ? "border-orange-300 bg-orange-100 text-orange-900 hover:bg-orange-200" : "border-stone-300 bg-surface text-foreground hover:border-brand hover:bg-orange-50"
                    }`}
                  >
                    <span className="text-xl font-extrabold tracking-tight">{seat.code}</span>
                    <span className="text-xs font-semibold">
                      {seat.session ? `${t("counter.pickInUse")} · ${rupees(seat.session.total)}` : t("counter.pickFree")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
