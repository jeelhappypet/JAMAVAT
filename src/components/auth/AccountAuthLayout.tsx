"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

/** Shared shell for the public account pages (login, forgot/reset password) — outside any restaurant, so no restaurant name or staff tabs. */
export function AccountAuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface-muted px-4 py-10">
      <div className="flex w-full max-w-[420px] items-center justify-between">
        <Link href="/" aria-label="Jamavat">
          <BrandMark withName />
        </Link>
        <LanguageToggle />
      </div>
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-3xl border border-border bg-surface p-7">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[22px] font-extrabold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-[15px] text-text-muted">{subtitle}</p> : null}
        </div>
        {children}
      </div>
      {footer}
    </div>
  );
}
