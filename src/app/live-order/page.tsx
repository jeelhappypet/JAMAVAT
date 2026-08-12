"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HomeButton } from "@/components/ui/HomeButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OrderCard } from "@/components/orders/OrderCard";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { useActiveOrders } from "@/lib/orders/useActiveOrders";

export default function LiveOrderPage() {
  const router = useRouter();
  const { orders, loading, error, connectionState, refetch } = useActiveOrders("live");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleComplete(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/orders/${id}/complete`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ઓર્ડર પૂર્ણ કરી શકાયો નથી");
      }
      router.push("/");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "ઓર્ડર પૂર્ણ કરી શકાયો નથી");
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelConfirmed() {
    const id = cancelTarget;
    if (!id) return;
    setCancelTarget(null);
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ઓર્ડર રદ કરી શકાયો નથી");
      }
      router.push("/");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "ઓર્ડર રદ કરી શકાયો નથી");
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <HomeButton />
        <h1 className="text-xl font-bold">ચાલુ ઓર્ડર</h1>
        <RealtimeStatus state={connectionState} />
      </div>

      {(error || actionError) ? (
        <p className="text-center text-danger">{actionError || error}</p>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <EmptyState title="કોઈ ચાલુ ઓર્ડર નથી" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              tokenNumber={order.tokenNumber}
              customerName={order.customerName}
              totalAmount={order.totalAmount}
              status={order.status}
              busy={busyId === order.id}
              onComplete={() => handleComplete(order.id)}
              onCancel={() => setCancelTarget(order.id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={cancelTarget !== null}
        title="ઓર્ડર રદ કરવો છે?"
        description="આ ક્રિયા પાછી ફેરવી શકાશે નહીં."
        confirmLabel="હા, રદ કરો"
        onConfirm={handleCancelConfirmed}
        onCancel={() => setCancelTarget(null)}
      />
    </main>
  );
}
