import Link from "next/link";
import type { ReactNode } from "react";

interface HomeActionCardProps {
  href: string;
  label: string;
  icon: ReactNode;
  accent?: "brand" | "success" | "danger" | "neutral";
}

const ACCENT_CLASS: Record<Required<HomeActionCardProps>["accent"], string> = {
  brand: "bg-brand text-white",
  success: "bg-success text-white",
  danger: "bg-danger text-white",
  neutral: "bg-stone-600 text-white",
};

export function HomeActionCard({ href, label, icon, accent = "neutral" }: HomeActionCardProps) {
  return (
    <Link
      href={href}
      className={`touch-target flex aspect-square flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center shadow-sm transition-transform active:scale-[0.97] ${ACCENT_CLASS[accent]}`}
    >
      <span className="[&_svg]:h-12 [&_svg]:w-12">{icon}</span>
      <span className="text-2xl font-bold">{label}</span>
    </Link>
  );
}
