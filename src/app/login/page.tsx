import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Staff, type StaffDocument } from "@/models/Staff";
import { getRestaurantName } from "@/lib/restaurant";
import { LoginScreen } from "@/components/auth/LoginScreen";
import type { StaffLoginOption, StaffRole } from "@/types";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;

  await connectToDatabase();
  const active = await Staff.find({ isActive: true })
    .sort({ name: 1 })
    .select({ name: 1, role: 1 })
    .lean<Pick<StaffDocument, "_id" | "name" | "role">[]>();

  if (active.length === 0 && (await Staff.countDocuments()) === 0) {
    redirect("/setup");
  }

  const staff: StaffLoginOption[] = active.map((s) => ({
    id: String(s._id),
    name: s.name,
    role: s.role as StaffRole,
  }));

  return (
    <LoginScreen
      restaurantName={await getRestaurantName()}
      staff={staff}
      next={typeof params.next === "string" ? params.next : undefined}
      expired={params.expired !== undefined}
    />
  );
}
