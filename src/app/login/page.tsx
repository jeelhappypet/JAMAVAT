import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Staff, type StaffDocument } from "@/models/Staff";
import { Category, type CategoryDocument } from "@/models/Category";
import { Menu, type MenuDocument } from "@/models/Menu";
import { getRestaurantName } from "@/lib/restaurant";
import { LoginScreen } from "@/components/auth/LoginScreen";
import type { StaffLoginOption, StaffRole } from "@/types";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;

  await connectToDatabase();
  const active = await Staff.find({ isActive: true })
    .sort({ name: 1 })
    .select({ name: 1, role: 1, categoryIds: 1 })
    .lean<Pick<StaffDocument, "_id" | "name" | "role" | "categoryIds">[]>();

  if (active.length === 0 && (await Staff.countDocuments()) === 0) {
    redirect("/setup");
  }

  const [categories, menus] = await Promise.all([
    Category.find().select({ menuId: 1 }).lean<Pick<CategoryDocument, "_id" | "menuId">[]>(),
    Menu.find().select({ name: 1, nameGu: 1 }).lean<Pick<MenuDocument, "_id" | "name" | "nameGu">[]>(),
  ]);
  const menuOfCategory = new Map(categories.map((c) => [String(c._id), String(c.menuId)]));
  const menuById = new Map(menus.map((m) => [String(m._id), m]));
  const stationOf = (categoryIds: unknown[] = []) => {
    const menuIds = new Set(categoryIds.map((id) => menuOfCategory.get(String(id))).filter(Boolean));
    const menu = menuIds.size === 1 ? menuById.get([...menuIds][0]!) : undefined;
    return menu ? { name: menu.name, nameGu: menu.nameGu || undefined } : undefined;
  };

  const staff: StaffLoginOption[] = active.map((s) => ({
    id: String(s._id),
    name: s.name,
    role: s.role as StaffRole,
    station: s.role === "KITCHEN" ? stationOf(s.categoryIds) : undefined,
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
