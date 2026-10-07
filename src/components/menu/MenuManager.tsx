"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { VegMark } from "@/components/menu/VegMark";
import { MenuEntityDialog, type EntityKind, type EntityValues } from "@/components/menu/MenuEntityDialog";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { CategoryDTO, MenuDTO, MenuItemDTO } from "@/types";

type DialogState =
  | { kind: EntityKind; mode: "create"; parentId?: string }
  | { kind: "menu"; mode: "edit"; target: MenuDTO }
  | { kind: "category"; mode: "edit"; target: CategoryDTO }
  | { kind: "item"; mode: "edit"; target: MenuItemDTO };

type DeleteTarget = { kind: EntityKind; id: string; name: string };

const ENDPOINT: Record<EntityKind, string> = {
  menu: "/api/menu/menus",
  category: "/api/menu/categories",
  item: "/api/menu/items",
};

const iconButton =
  "flex h-10 w-10 items-center justify-center rounded-[10px] border border-stone-300 bg-surface text-stone-700 active:bg-surface-muted disabled:opacity-35";
const textButton = "h-10 rounded-[10px] border border-stone-300 bg-surface px-3.5 text-sm font-bold active:bg-surface-muted";
const primaryButton = "h-10 rounded-[10px] bg-brand px-3.5 text-sm font-bold text-white active:bg-brand-dark";

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  up: "m18 15-6-6-6 6",
  down: "m6 9 6 6 6-6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1",
  plus: "M12 5v14M5 12h14",
};

export function MenuManager() {
  const { t, lang } = useI18n();
  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/menu");
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      setMenus(data.menus);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("err.menuLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  // Another admin (or a kitchen marking sold out) changed the menu — stay in sync.
  const { state: realtimeState } = useRealtime({ [REALTIME_EVENTS.MENU_UPDATED]: load }, load);

  /** Sends a change and reloads the tree. Returns an error message, or null when it worked. */
  const send = useCallback(
    async (method: string, url: string, body?: unknown): Promise<string | null> => {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (redirectToLoginIfUnauthorized(res)) return null;
      const data = await res.json().catch(() => null);
      if (!res.ok) return data?.error ?? t("err.saveFailed");
      await load();
      return null;
    },
    [load, t]
  );

  async function act(method: string, url: string, body?: unknown) {
    setError(null);
    const message = await send(method, url, body);
    if (message) setError(message);
  }

  function move<T extends { id: string }>(list: T[], index: number, delta: number, kind: "menu" | "category") {
    const ids = list.map((entry) => entry.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    void act("POST", "/api/menu/reorder", { kind, ids });
  }

  const categoryOptions = useMemo(
    () =>
      menus.flatMap((menu) =>
        menu.categories.map((category) => ({
          id: category.id,
          label: menus.length > 1 ? `${localName(lang, menu.name, menu.nameGu)} · ${localName(lang, category.name, category.nameGu)}` : localName(lang, category.name, category.nameGu),
        }))
      ),
    [menus, lang]
  );

  async function submitDialog(values: EntityValues): Promise<string | null> {
    if (!dialog) return null;
    const base = { name: values.name.trim(), nameGu: values.nameGu.trim() };
    const item = { ...base, price: Number(values.price), isVeg: values.isVeg, categoryId: values.categoryId };
    let message: string | null;
    if (dialog.mode === "create") {
      const body = dialog.kind === "menu" ? base : dialog.kind === "category" ? { ...base, menuId: dialog.parentId } : item;
      message = await send("POST", ENDPOINT[dialog.kind], body);
    } else {
      message = await send("PATCH", `${ENDPOINT[dialog.kind]}/${dialog.target.id}`, dialog.kind === "item" ? item : base);
    }
    if (!message) setDialog(null);
    return message;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await act("DELETE", `${ENDPOINT[target.kind]}/${target.id}`);
  }

  const name = (entry: { name: string; nameGu?: string }) => localName(lang, entry.name, entry.nameGu);
  const otherName = (entry: { name: string; nameGu?: string }) => (lang === "gu" ? entry.name : entry.nameGu);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex max-w-[720px] flex-col gap-1.5">
          <h1 className="text-[26px] font-extrabold tracking-tight">{t("menu.title")}</h1>
          <p className="text-[15px] leading-relaxed text-text-muted">{t("menu.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <RealtimeStatus state={realtimeState} />
          <button
            type="button"
            onClick={() => setDialog({ kind: "menu", mode: "create" })}
            className="flex h-[46px] items-center gap-2 rounded-xl bg-brand px-[18px] text-[15px] font-extrabold text-white active:bg-brand-dark"
          >
            <Icon d={ICONS.plus} />
            {t("menu.addMenu")}
          </button>
        </div>
      </div>

      {menus.length === 1 ? (
        <div className="flex items-start gap-2.5 rounded-[14px] border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-stone-700">
          <svg className="mt-0.5 shrink-0 text-brand" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v5h1" />
          </svg>
          {t("menu.singleMenuNote")}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
          {error}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}

      {menus.map((menu, menuIndex) => (
        <section key={menu.id} className={`overflow-hidden rounded-[18px] border border-border bg-surface ${menu.isActive ? "" : "opacity-75"}`}>
          <Row
            className="bg-orange-50 px-[18px] py-4"
            title={
              <>
                <span className="text-lg font-extrabold">{name(menu)}</span>
                {otherName(menu) ? <span className="text-sm text-text-muted">{otherName(menu)}</span> : null}
                {!menu.isActive ? <Badge>{t("menu.hidden")}</Badge> : null}
                <span className="text-[13px] text-text-muted">· {t("menu.categoriesCount", { n: menu.categories.length })}</span>
              </>
            }
            actions={
              <>
                <button type="button" className={primaryButton} onClick={() => setDialog({ kind: "category", mode: "create", parentId: menu.id })}>
                  + {t("menu.addCategory")}
                </button>
                <button type="button" className={iconButton} aria-label={t("menu.edit")} title={t("menu.edit")} onClick={() => setDialog({ kind: "menu", mode: "edit", target: menu })}>
                  <Icon d={ICONS.edit} />
                </button>
                <button type="button" className={iconButton} aria-label={menu.isActive ? t("menu.hide") : t("menu.show")} title={menu.isActive ? t("menu.hide") : t("menu.show")} onClick={() => act("PATCH", `${ENDPOINT.menu}/${menu.id}`, { isActive: !menu.isActive })}>
                  <Icon d={menu.isActive ? ICONS.eyeOff : ICONS.eye} />
                </button>
                <button type="button" className={iconButton} aria-label={t("menu.moveUp")} title={t("menu.moveUp")} disabled={menuIndex === 0} onClick={() => move(menus, menuIndex, -1, "menu")}>
                  <Icon d={ICONS.up} />
                </button>
                <button type="button" className={iconButton} aria-label={t("menu.moveDown")} title={t("menu.moveDown")} disabled={menuIndex === menus.length - 1} onClick={() => move(menus, menuIndex, 1, "menu")}>
                  <Icon d={ICONS.down} />
                </button>
                {menu.categories.length === 0 ? (
                  <button type="button" className={`${iconButton} text-danger`} aria-label={t("menu.delete")} title={t("menu.delete")} onClick={() => setDeleteTarget({ kind: "menu", id: menu.id, name: name(menu) })}>
                    <Icon d={ICONS.trash} />
                  </button>
                ) : null}
              </>
            }
          />

          {menu.categories.length === 0 ? <p className="border-t border-border px-[18px] py-5 text-[15px] text-text-muted">{t("menu.emptyMenu")}</p> : null}

          {menu.categories.map((category, categoryIndex) => (
            <div key={category.id} className={`border-t border-border ${category.isActive ? "" : "bg-surface-muted"}`}>
              <Row
                className="px-[18px] py-3"
                title={
                  <>
                    <span className="text-base font-extrabold">{name(category)}</span>
                    {otherName(category) ? <span className="text-sm text-text-muted">{otherName(category)}</span> : null}
                    {!category.isActive ? <Badge>{t("menu.hidden")}</Badge> : null}
                    <span className="text-[13px] text-text-muted">· {t("menu.itemsCount", { n: category.items.length })}</span>
                  </>
                }
                actions={
                  <>
                    <button type="button" className={textButton} onClick={() => setDialog({ kind: "item", mode: "create", parentId: category.id })}>
                      + {t("menu.addItem")}
                    </button>
                    <button type="button" className={iconButton} aria-label={t("menu.edit")} title={t("menu.edit")} onClick={() => setDialog({ kind: "category", mode: "edit", target: category })}>
                      <Icon d={ICONS.edit} />
                    </button>
                    <button type="button" className={iconButton} aria-label={category.isActive ? t("menu.hide") : t("menu.show")} title={category.isActive ? t("menu.hide") : t("menu.show")} onClick={() => act("PATCH", `${ENDPOINT.category}/${category.id}`, { isActive: !category.isActive })}>
                      <Icon d={category.isActive ? ICONS.eyeOff : ICONS.eye} />
                    </button>
                    <button type="button" className={iconButton} aria-label={t("menu.moveUp")} title={t("menu.moveUp")} disabled={categoryIndex === 0} onClick={() => move(menu.categories, categoryIndex, -1, "category")}>
                      <Icon d={ICONS.up} />
                    </button>
                    <button type="button" className={iconButton} aria-label={t("menu.moveDown")} title={t("menu.moveDown")} disabled={categoryIndex === menu.categories.length - 1} onClick={() => move(menu.categories, categoryIndex, 1, "category")}>
                      <Icon d={ICONS.down} />
                    </button>
                    {category.items.length === 0 ? (
                      <button type="button" className={`${iconButton} text-danger`} aria-label={t("menu.delete")} title={t("menu.delete")} onClick={() => setDeleteTarget({ kind: "category", id: category.id, name: name(category) })}>
                        <Icon d={ICONS.trash} />
                      </button>
                    ) : null}
                  </>
                }
              />

              {category.items.length === 0 ? (
                <p className="px-[18px] pb-4 text-sm text-text-muted">{t("menu.emptyCategory")}</p>
              ) : (
                <ul className="pb-2">
                  {category.items.map((item) => (
                    <li key={item.id} className={`flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-100 px-[18px] py-2.5 ${item.isActive ? "" : "opacity-60"}`}>
                      <div className="flex min-w-0 flex-[1_1_220px] items-center gap-2.5">
                        <VegMark isVeg={item.isVeg} label={item.isVeg ? t("menu.veg") : t("menu.nonVeg")} />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[15px] font-bold">{name(item)}</span>
                          {otherName(item) ? <span className="truncate text-[13px] text-text-muted">{otherName(item)}</span> : null}
                        </span>
                        {!item.isActive ? <Badge>{t("menu.hidden")}</Badge> : null}
                      </div>
                      <span className="w-20 text-right text-[15px] font-extrabold tabular-nums">₹{item.price}</span>
                      <label className="flex h-10 items-center gap-2 rounded-[10px] border border-stone-300 px-3 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={!item.isAvailable}
                          onChange={() => act("PATCH", `${ENDPOINT.item}/${item.id}`, { isAvailable: !item.isAvailable })}
                          className="h-5 w-5 accent-[#c2410c]"
                        />
                        <span className={item.isAvailable ? "text-stone-700" : "font-bold text-danger"}>{t("menu.soldOut")}</span>
                      </label>
                      <div className="flex gap-2">
                        <button type="button" className={iconButton} aria-label={t("menu.edit")} title={t("menu.edit")} onClick={() => setDialog({ kind: "item", mode: "edit", target: item })}>
                          <Icon d={ICONS.edit} />
                        </button>
                        <button type="button" className={iconButton} aria-label={item.isActive ? t("menu.hide") : t("menu.show")} title={item.isActive ? t("menu.hide") : t("menu.show")} onClick={() => act("PATCH", `${ENDPOINT.item}/${item.id}`, { isActive: !item.isActive })}>
                          <Icon d={item.isActive ? ICONS.eyeOff : ICONS.eye} />
                        </button>
                        <button type="button" className={`${iconButton} text-danger`} aria-label={t("menu.delete")} title={t("menu.delete")} onClick={() => setDeleteTarget({ kind: "item", id: item.id, name: name(item) })}>
                          <Icon d={ICONS.trash} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}

      {dialog ? (
        <MenuEntityDialog
          kind={dialog.kind}
          mode={dialog.mode}
          categoryOptions={categoryOptions}
          initial={
            dialog.mode === "create"
              ? { categoryId: dialog.kind === "item" ? dialog.parentId : undefined }
              : dialog.kind === "item"
                ? { name: dialog.target.name, nameGu: dialog.target.nameGu, price: String(dialog.target.price), isVeg: dialog.target.isVeg, categoryId: dialog.target.categoryId }
                : { name: dialog.target.name, nameGu: dialog.target.nameGu }
          }
          onClose={() => setDialog(null)}
          onSubmit={submitDialog}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? t("menu.confirmDeleteTitle", { name: deleteTarget.name }) : ""}
        description={deleteTarget?.kind === "item" ? t("menu.confirmDeleteItem") : t("menu.confirmDeleteGroup")}
        confirmLabel={t("menu.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

function Row({ title, actions, className = "" }: { title: ReactNode; actions: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">{title}</div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="self-center rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-700">{children}</span>;
}
