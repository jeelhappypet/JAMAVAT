"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { GstMode, RestaurantSettingsDTO } from "@/types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { billTotals, halfPercent } from "@/lib/gst";

/** How much the example bill under the GST switch is for. */
const EXAMPLE_BILL = 1000;

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/** Restaurant name (header, login, guest pages), the invoice details and GST. */
export function SettingsForm({ initial, mailReady }: { initial: RestaurantSettingsDTO; mailReady: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ name: initial.name, address: initial.address ?? "", phone: initial.phone ?? "", reviewUrl: initial.reviewUrl ?? "" });
  // The rate is a string while it's being typed — "1" on the way to "12" must
  // not snap to 1, and an empty box must stay empty rather than become 0.
  const [gst, setGst] = useState({
    enabled: initial.gst.enabled,
    percent: initial.gst.percent ? String(initial.gst.percent) : "",
    mode: initial.gst.mode,
    gstin: initial.gst.gstin ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const percent = Math.min(28, Math.max(0, Number(gst.percent) || 0));
  const gstPayload = { enabled: gst.enabled, percent, mode: gst.mode, gstin: gst.gstin.trim() || undefined };
  const example = billTotals(EXAMPLE_BILL, 0, gstPayload);

  const gstField = (key: "percent" | "gstin") => ({
    value: gst[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setGst((prev) => ({ ...prev, [key]: e.target.value }));
      setSaved(false);
    },
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setSaved(false);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName: form.name, address: form.address, phone: form.phone, reviewUrl: form.reviewUrl, gst: gstPayload }),
      });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("err.saveFailed"));
      setForm({ name: data.name, address: data.address ?? "", phone: data.phone ?? "", reviewUrl: data.reviewUrl ?? "" });
      setGst({ enabled: data.gst.enabled, percent: data.gst.percent ? String(data.gst.percent) : "", mode: data.gst.mode as GstMode, gstin: data.gst.gstin ?? "" });
      setSaved(true);
      router.refresh(); // header shows the new name
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="text-[26px] font-extrabold tracking-tight">{t("settings.title")}</h1>

      <form onSubmit={handleSubmit} className="flex max-w-[640px] flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-[18px]">
        <h2 className="text-[17px] font-extrabold">{t("settings.restaurant")}</h2>
        <TextField label={t("settings.restaurantName")} hint={t("settings.restaurantHint")} {...field("name")} />

        <h2 className="mt-2 text-[17px] font-extrabold">{t("settings.emailTitle")}</h2>
        <p className="-mt-2 text-[13px] text-text-muted">{mailReady ? t("settings.emailHint") : t("settings.emailOff")}</p>
        <TextField label={t("settings.address")} autoComplete="street-address" {...field("address")} />
        <TextField label={t("settings.phone")} type="tel" autoComplete="tel" {...field("phone")} />
        <TextField label={t("settings.reviewUrl")} hint={t("settings.reviewHint")} type="url" inputMode="url" placeholder="https://g.page/r/…" {...field("reviewUrl")} />

        <h2 className="mt-2 text-[17px] font-extrabold">{t("settings.gstTitle")}</h2>
        <p className="-mt-2 text-[13px] text-text-muted">{t("settings.gstHint")}</p>
        <Checkbox
          checked={gst.enabled}
          onChange={(checked) => {
            setGst((prev) => ({ ...prev, enabled: checked }));
            setSaved(false);
          }}
          label={<span className="text-[15px] font-bold">{t("settings.gstEnable")}</span>}
        />

        {gst.enabled ? (
          <>
            {/* Sized by the wrapper: `TextField`'s own base styles include `w-full`. */}
            <span className="w-[160px]">
              <TextField label={t("settings.gstPercent")} hint={t("settings.gstPercentHint")} type="number" inputMode="decimal" min={0} max={28} step={0.5} {...gstField("percent")} />
            </span>
            <ChoiceCards
              name="gstMode"
              legend={t("settings.gstMode")}
              value={gst.mode}
              onChange={(mode: GstMode) => {
                setGst((prev) => ({ ...prev, mode }));
                setSaved(false);
              }}
              options={[
                { value: "CGST_SGST", label: t("settings.gstModeSplit") },
                { value: "IGST", label: t("settings.gstModeIgst") },
              ]}
            />
            <p className="-mt-1 text-[13px] text-text-muted">{gst.mode === "IGST" ? t("settings.gstModeIgstHint") : t("settings.gstModeSplitHint")}</p>
            <TextField label={t("settings.gstin")} hint={t("settings.gstinHint")} autoCapitalize="characters" maxLength={15} placeholder="24AAAAA0000A1Z5" {...gstField("gstin")} />
            {/* What the owner is actually asking: "so what does a guest pay now?" */}
            <p className="rounded-[13px] bg-surface-muted px-3.5 py-2.5 text-[13px] font-semibold text-foreground">
              {t("settings.gstExample", { taxable: EXAMPLE_BILL.toLocaleString("en-IN"), tax: rupees(example.tax?.amount ?? 0), total: rupees(example.total) })}
              {example.tax?.mode === "CGST_SGST" ? (
                <span className="font-medium text-text-muted">
                  {" "}
                  ({t("tax.cgst", { p: halfPercent(example.tax.percent) })} {rupees(example.tax.cgst ?? 0)} + {t("tax.sgst", { p: halfPercent(example.tax.percent) })}{" "}
                  {rupees(example.tax.sgst ?? 0)})
                </span>
              ) : null}
            </p>
          </>
        ) : null}

        {error ? <Alert>{error}</Alert> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
          {saved ? (
            <span role="status" className="flex items-center gap-1.5 text-sm font-semibold text-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
              {t("common.saved")}
            </span>
          ) : null}
        </div>
      </form>
    </>
  );
}
