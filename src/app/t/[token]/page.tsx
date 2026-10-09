import { resolveSeat } from "@/lib/tables";
import { getGuest } from "@/lib/guest/session";
import { getGuestState } from "@/lib/guest/state";
import { loadMenuTree } from "@/lib/menu/structure";
import { getRestaurantName } from "@/lib/restaurant";
import { GuestApp } from "@/components/guest/GuestApp";
import { viewFromSearch } from "@/lib/guest/view";
import { InvalidQr } from "@/components/guest/InvalidQr";
import type { Metadata } from "next";

// The guest's tab shows the restaurant they're eating at, not the software's name.
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRestaurantName()) ?? "Jamavat" };
}

export default async function GuestTablePage({ params, searchParams }: PageProps<"/t/[token]">) {
  const { token } = await params;
  const { v } = await searchParams;
  const resolved = await resolveSeat(token);
  const restaurantName = (await getRestaurantName()) ?? "Jamavat";
  if (!resolved) return <InvalidQr restaurantName={restaurantName} />;

  const [menus, state] = await Promise.all([loadMenuTree({ activeOnly: true }), getGuestState(resolved, await getGuest())]);
  // The step comes from the URL so a reloaded back-navigation renders it straight away.
  return <GuestApp token={token} restaurantName={restaurantName} initialMenus={menus} initialState={state} initialView={viewFromSearch(typeof v === "string" ? v : undefined)} />;
}
