import type { Metadata } from "next";
import { resolveSeat } from "@/lib/tables";
import { getGuest } from "@/lib/guest/session";
import { getGuestState } from "@/lib/guest/state";
import { loadMenuTree } from "@/lib/menu/structure";
import { getRestaurantInfo } from "@/lib/restaurant";
import { GuestApp } from "@/components/guest/GuestApp";
import { viewFromSearch } from "@/lib/guest/view";
import { InvalidQr } from "@/components/guest/InvalidQr";

/**
 * The guest page keeps the short `/t/{token}` link even though restaurants
 * now live under `/r/{slug}`: the QRs are already printed, and a shorter URL
 * makes a less dense QR. The token says which restaurant it belongs to.
 */
// The guest's tab shows the restaurant they're eating at, not the software's name.
export async function generateMetadata({ params }: PageProps<"/t/[token]">): Promise<Metadata> {
  const { token } = await params;
  const resolved = await resolveSeat(token);
  return { title: (resolved ? (await getRestaurantInfo(resolved.restaurantId))?.name : null) ?? "Jamavat" };
}

export default async function GuestTablePage({ params, searchParams }: PageProps<"/t/[token]">) {
  const { token } = await params;
  const { v } = await searchParams;
  const resolved = await resolveSeat(token);
  if (!resolved) return <InvalidQr restaurantName="Jamavat" />;
  const restaurant = await getRestaurantInfo(resolved.restaurantId);
  const restaurantName = restaurant?.name ?? "Jamavat";

  const [menus, state] = await Promise.all([
    loadMenuTree(resolved.restaurantId, { activeOnly: true }),
    getGuestState(resolved, await getGuest()),
  ]);
  // The step comes from the URL so a reloaded back-navigation renders it straight away.
  return (
    <GuestApp
      token={token}
      restaurantName={restaurantName}
      // Whether the counter adds GST, so the cart doesn't quote a total the
      // guest won't be asked for.
      gst={restaurant?.gst ?? { enabled: false, percent: 0, mode: "CGST_SGST" }}
      initialMenus={menus}
      initialState={state}
      initialView={viewFromSearch(typeof v === "string" ? v : undefined)}
    />
  );
}
