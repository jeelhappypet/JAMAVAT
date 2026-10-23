import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RestaurantProvider } from "@/components/shell/RestaurantProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { getRestaurantBySlug } from "@/lib/restaurant";

/** One restaurant's staff app. Never Jamavat's own pages, so never indexed. */
export async function generateMetadata({ params }: LayoutProps<"/r/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getRestaurantBySlug(slug);
  return {
    title: { default: found?.restaurant.name ?? "Jamavat", template: `%s · ${found?.restaurant.name ?? "Jamavat"}` },
    // Each restaurant installs its own app, opening on its own login screen.
    manifest: `/r/${slug}/manifest.webmanifest`,
    robots: { index: false, follow: false },
  };
}

export default async function RestaurantAppLayout({ children, params }: LayoutProps<"/r/[slug]">) {
  const { slug } = await params;
  const found = await getRestaurantBySlug(slug);
  if (!found) notFound();
  // HQ renamed this restaurant's link: send old bookmarks and installed apps to the new one.
  if (found.movedTo) redirect(`/r/${found.movedTo}`);

  return (
    <RestaurantProvider id={found.restaurant.id} slug={found.restaurant.slug} name={found.restaurant.name}>
      {/* Only the staff app is installed and only it has an offline shell, so
          only it registers the worker. A guest who scans a QR once, and a
          visitor reading the website, used to install it from the root layout. */}
      <ServiceWorkerRegister />
      {children}
    </RestaurantProvider>
  );
}
