import { notFound, redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Staff, type StaffDocument } from "@/models/Staff";
import { Category, type CategoryDocument } from "@/models/Category";
import { Menu, type MenuDocument } from "@/models/Menu";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { appPath } from "@/lib/auth/access";
import { LoginScreen } from "@/components/auth/LoginScreen";
import type { StaffLoginOption, StaffRole } from "@/types";

export default async function LoginPage({ params, searchParams }: PageProps<"/r/[slug]/login">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const found = await getRestaurantBySlug(slug);
  if (!found) notFound();
  if (found.movedTo) redirect(appPath(found.movedTo, "/login"));
  const restaurantId = found.restaurant.id;

  await connectToDatabase();
  const active = await Staff.find({ restaurantId, isActive: true })
    .sort({ name: 1 })
    .select({ name: 1, role: 1, categoryIds: 1 })
    .lean<Pick<StaffDocument, "_id" | "name" | "role" | "categoryIds">[]>();

  // A restaurant HQ has just created has no logins yet — its owner opens the
  // invite link they were emailed instead (/welcome?invite=…).
  if (active.length === 0 && (await Staff.countDocuments({ restaurantId })) === 0) {
    redirect(appPath(slug, "/welcome"));
  }

  // Kitchen logins show which station they are ("Kitchen · Gujarati"), which
  // means their categories' menu. Only those categories, and only when some
  // kitchen login is on the list — this screen is the one staff wait on, and
  // it used to read every category and every menu of the restaurant to put a
  // word under two names.
  const kitchenCategoryIds = [...new Set(active.filter((s) => s.role === "KITCHEN").flatMap((s) => (s.categoryIds ?? []).map(String)))];
  const categories = kitchenCategoryIds.length
    ? await Category.find({ restaurantId, _id: { $in: kitchenCategoryIds } }).select({ menuId: 1 }).lean<Pick<CategoryDocument, "_id" | "menuId">[]>()
    : [];
  const menus = categories.length
    ? await Menu.find({ restaurantId, _id: { $in: [...new Set(categories.map((c) => String(c.menuId)))] } })
        .select({ name: 1, nameGu: 1 })
        .lean<Pick<MenuDocument, "_id" | "name" | "nameGu">[]>()
    : [];
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
      slug={found.restaurant.slug}
      restaurantName={found.restaurant.name}
      staff={staff}
      next={typeof query.next === "string" ? query.next : undefined}
      expired={query.expired !== undefined}
    />
  );
}
