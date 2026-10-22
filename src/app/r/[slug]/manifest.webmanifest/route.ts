import { NextResponse } from "next/server";
import { appPath } from "@/lib/auth/access";
import { getRestaurantBySlug } from "@/lib/restaurant";

/**
 * One manifest per restaurant: the installed app is that restaurant's, opens
 * straight on its login (never Jamavat's website) and shows its own name.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getRestaurantBySlug(slug);
  if (!found) return new NextResponse("Not found", { status: 404 });
  const base = appPath(found.restaurant.slug);

  return NextResponse.json(
    {
      name: found.restaurant.name,
      short_name: found.restaurant.name,
      description: `${found.restaurant.name} — orders, kitchens and bills on Jamavat`,
      start_url: `${base}/login`,
      scope: `${base}/`,
      id: `${base}/`,
      display: "standalone",
      background_color: "#fdfaf7",
      theme_color: "#b2560a",
      orientation: "any",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" } }
  );
}
