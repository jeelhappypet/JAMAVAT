"use client";

import { useState } from "react";
import { HomeButton } from "@/components/ui/HomeButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { KitchenTicket } from "@/components/orders/KitchenTicket";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { useActiveOrders } from "@/lib/orders/useActiveOrders";

export default function PendingOrderPage() {
  const { orders, loading, error, connectionState, refetch, removeOrder } = useActiveOrders("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleReady(id: string) {
    setBusyId(id);
    setActionError(null);
    removeOrder(id);
    try {
      const res = await fetch(`/api/orders/${id}/ready`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ઓર્ડર તૈયાર તરીકે માર્ક કરી શકાયો નથી");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "ઓર્ડર તૈયાર તરીકે માર્ક કરી શકાયો નથી");
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <HomeButton />
        <h1 className="text-xl font-bold">બાકી ઓર્ડર</h1>
        <RealtimeStatus state={connectionState} />
      </div>

      {(error || actionError) ? (
        <p className="text-center text-danger">{actionError || error}</p>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <EmptyState title="કોઈ બાકી ઓર્ડર નથી" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <KitchenTicket
              key={order.id}
              tokenNumber={order.tokenNumber}
              customerName={order.customerName}
              items={order.items}
              busy={busyId === order.id}
              onReady={() => handleReady(order.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
