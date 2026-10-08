"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { MenuDTO, StaffDTO } from "@/types";

interface RoutingMatrixProps {
  staff: StaffDTO[];
  menus: MenuDTO[];
  currentStaffId: string;
  onToggle: (member: StaffDTO, categoryId: string) => void;
  onEdit: (member: StaffDTO) => void;
}

const GROUP_TINTS = [
  { bg: "#fff7ed", fg: "#9a3412" },
  { bg: "#f5f5f4", fg: "#44403c" },
];

export interface RoutingColumn {
  category: MenuDTO["categories"][number];
  menu: MenuDTO;
  tint: (typeof GROUP_TINTS)[number];
}

export function routingColumns(menus: MenuDTO[]): { groups: { menu: MenuDTO; tint: RoutingColumn["tint"]; categories: MenuDTO["categories"] }[]; columns: RoutingColumn[] } {
  const groups = menus
    .filter((menu) => menu.isActive)
    .map((menu, index) => ({ menu, tint: GROUP_TINTS[index % GROUP_TINTS.length], categories: menu.categories.filter((c) => c.isActive) }))
    .filter((group) => group.categories.length > 0);
  return { groups, columns: groups.flatMap((group) => group.categories.map((category) => ({ category, menu: group.menu, tint: group.tint }))) };
}

/** The "Who sees which orders" grid from the Admin artboard: every login × every category. */
export function RoutingMatrix({ staff, menus, currentStaffId, onToggle, onEdit }: RoutingMatrixProps) {
  const { t, lang } = useI18n();
  const { groups, columns } = routingColumns(menus);
  const template = `minmax(200px, 1.6fr) repeat(${columns.length}, minmax(86px, 1fr)) minmax(110px, 0.9fr)`;

  return (
    <section className="overflow-x-auto rounded-[18px] border border-border bg-surface">
      <div style={{ minWidth: 360 + columns.length * 96 }}>
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

        {staff.map((member) => {
          const seesAll = member.role !== "KITCHEN";
          const count = columns.filter(({ category }) => member.categoryIds.includes(category.id)).length;
          return (
            <div key={member.id} className="grid min-h-16 items-center border-b border-stone-100 px-4 last:border-b-0" style={{ gridTemplateColumns: template }}>
              <button type="button" onClick={() => onEdit(member)} aria-label={t("staff.editLabel", { name: member.name })} className="flex min-w-0 items-center gap-2.5 py-2 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-200 text-sm font-extrabold">{member.name.charAt(0).toUpperCase()}</span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-bold underline-offset-2 hover:underline">{member.name}</span>
                  <span className="flex flex-wrap gap-1">
                    <Badge size="sm" tone={seesAll ? "stone" : "orange"}>
                      {seesAll ? t("routing.roleAll", { role: t(`role.${member.role}`) }) : t(`role.${member.role}`)}
                    </Badge>
                    {member.id === currentStaffId ? (
                      <Badge size="sm" tone="brand">
                        {t("staff.you")}
                      </Badge>
                    ) : null}
                    {member.isLocked ? (
                      <Badge size="sm" tone="red">
                        {t("staff.locked")}
                      </Badge>
                    ) : null}
                  </span>
                </span>
              </button>
              {columns.map(({ category }) => (
                <span key={category.id} className="flex justify-center">
                  <Checkbox
                    size="lg"
                    checked={seesAll || member.categoryIds.includes(category.id)}
                    disabled={seesAll}
                    onChange={() => onToggle(member, category.id)}
                    aria-label={t("routing.cellLabel", { name: member.name, category: localName(lang, category.name, category.nameGu) })}
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
    </section>
  );
}
