import { requirePageStaff } from "@/lib/auth/page";
import { MenuManager } from "@/components/menu/MenuManager";
import { photoStorageReady } from "@/lib/menu/photo";

export default async function MenuPage({ params }: PageProps<"/r/[slug]/menu">) {
  const { slug } = await params;
  await requirePageStaff(slug, "/menu");

  return <MenuManager photosEnabled={photoStorageReady()} />;
}
