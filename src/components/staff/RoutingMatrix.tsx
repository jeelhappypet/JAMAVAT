"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { MenuDTO, StaffDTO } from "@/types";

interface RoutingMatrixProps {
  staff: StaffDTO[];
  menus: MenuDTO[];
  onToggle: (member: StaffDTO, categoryId: string) => void;
}

const GROUP_TINTS = [
  { bg: "#fff7ed", fg: "#9a3412" },
  { bg: "#f5f5f4", fg: "#44403c" },
];

/** The "Who sees which orders" grid from the Admin artboard: kitchen logins × categories. */
export function RoutingMatrix({ staff, menus, onToggle }: RoutingMatrixProps) {
  const { t, lang } = useI18n();

  const groups = menus
    .filter((menu) => menu.isActive)
    .map((menu, index) => ({ menu, tint: GROUP_TINTS[index % GROUP_TINTS.length], categories: menu.categories.filter((c) => c.isActive) }))
    .filter((group) => group.categories.length > 0);
  const columns = groups.flatMap((group) => group.categories.map((category) => ({ category, tint: group.tint })));
  const people = staff.filter((member) => member.isActive);
  const kitchens = people.filter((member) => member.role === "KITCHEN");

  const gaps = columns.filter(({ category }) => !kitchens.some((member) => member.categoryIds.includes(category.id)));
  const template = `minmax(200px, 1.6fr) repeat(${columns.length}, minmax(86px, 1fr)) minmax(110px, 0.9fr)`;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex max-w-[720px] flex-col gap-1.5">
        <h2 className="text-[22px] font-extrabold tracking-tight">{t("routing.title")}</h2>
        <p className="text-[15px] leading-relaxed text-text-muted">{t("routing.subtitle")}</p>
      </div>

      {columns.length === 0 ? (
        <Note tone="info">{t("routing.noCategories")}</Note>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[18px] border border-border bg-surface">
            <div style={{ minWidth: 340 + columns.length * 96 }}>
              {groups.length > 1 ? (
                <div className="grid px-4 pt-3 text-xs font-extrabold tracking-wide" style={{ gridTemplateColumns: template }}>
                  <span />
                  {groups.map((group) => (
                    <span
                      key={group.menu.id}
                      className="rounded-t-lg py-1.5 text-center uppercase"
                      style={{ gridColumn: `span ${group.categories.length}`, background: group.tint.bg, color: group.tint.fg }}
                    >
                      {t("routing.menuGroup", { name: localName(lang, group.menu.name, group.menu.nameGu) })}
                    </span>
                  ))}
                  <span />
                </div>
              ) : null}

              <div className="grid border-b border-border px-4 text-[13px] font-bold text-stone-700" style={{ gridTemplateColumns: template }}>
                <span className="py-2.5">{t("routing.staff")}</span>
                {columns.map(({ category, tint }) => (
                  <span key={category.id} className="px-1 py-2.5 text-center" style={{ background: tint.bg }}>
                    {localName(lang, category.name, category.nameGu)}
                  </span>
                ))}
                <span className="py-2.5 text-right">{t("routing.sees")}</span>
              </div>

              {people.map((member) => {
                const seesAll = member.role !== "KITCHEN";
                const count = columns.filter(({ category }) => member.categoryIds.includes(category.id)).length;
                return (
                  <div key={member.id} className="grid min-h-16 items-center border-b border-stone-100 px-4 last:border-b-0" style={{ gridTemplateColumns: template }}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-200 text-sm font-extrabold">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[15px] font-bold">{member.name}</span>
                        <span className={`self-start rounded-full px-2 py-0.5 text-[11px] font-bold ${seesAll ? "bg-stone-200 text-stone-900" : "bg-brand-light text-brand-dark"}`}>
                          {t(`role.${member.role}`)}
                        </span>
                      </span>
                    </div>
                    {columns.map(({ category }) => (
                      <span key={category.id} className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={seesAll || member.categoryIds.includes(category.id)}
                          disabled={seesAll}
                          onChange={() => onToggle(member, category.id)}
                          aria-label={t("routing.cellLabel", { name: member.name, category: localName(lang, category.name, category.nameGu) })}
                          className="h-6 w-6 cursor-pointer accent-[#c2410c] disabled:cursor-default"
                        />
                      </span>
                    ))}
                    <span className="text-right text-[13px] font-bold text-stone-700">
                      {seesAll ? t("routing.everything") : count === 0 ? t("routing.nothing") : t("routing.countOf", { n: count, total: columns.length })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {kitchens.length === 0 ? (
            <Note tone="info">{t("routing.noKitchen")}</Note>
          ) : gaps.length > 0 ? (
            <Note tone="warn">
              {t("routing.gap", { names: gaps.map(({ category }) => localName(lang, category.name, category.nameGu)).join(", ") })}
            </Note>
          ) : (
            <Note tone="ok">{t("routing.ok")}</Note>
          )}
        </>
      )}
    </section>
  );
}

function Note({ tone, children }: { tone: "ok" | "warn" | "info"; children: React.ReactNode }) {
  const styles = {
    ok: "bg-success-light text-green-900",
    warn: "bg-danger-light text-red-900",
    info: "border border-border bg-surface text-stone-700",
  }[tone];
  return <div className={`rounded-[14px] px-4 py-3 text-sm font-semibold leading-relaxed ${styles}`}>{children}</div>;
}
