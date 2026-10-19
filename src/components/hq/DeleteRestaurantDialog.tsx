"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";

/**
 * Deleting a restaurant cascades every menu, order, staff login, table,
 * bill and payment it owns — there's no soft-delete, so this is the one
 * place that destructive action can start, from either the list or the
 * detail page. Typing the name is the only thing that enables the button.
 */
export function DeleteRestaurantDialog({
  restaurant,
  onClose,
  onDeleted,
}: {
  restaurant: { id: string; name: string } | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setTyped("");
    setError(null);
    onClose();
  }

  async function confirm() {
    if (!restaurant) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/hq/restaurants/${restaurant.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't delete that restaurant");
      setTyped("");
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that restaurant");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={restaurant !== null} onClose={close} title={restaurant ? `Delete ${restaurant.name}?` : ""} size="sm">
      <div className="flex flex-col gap-3.5">
        <Alert tone="warning">This permanently deletes every menu, order, staff login, table, bill and payment for this restaurant. It can&apos;t be undone.</Alert>
        <TextField label={`Type "${restaurant?.name ?? ""}" to confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={close}>
            Cancel
          </Button>
          <Button variant="dangerSolid" size="lg" className="flex-1" disabled={busy || !restaurant || typed !== restaurant.name} onClick={confirm}>
            {busy ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
