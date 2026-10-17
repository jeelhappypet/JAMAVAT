"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

/**
 * HQ signs in with a code emailed to an address on the server's allowlist.
 * The first step always says "code sent", whatever address was typed, so
 * this screen can't be used to find out which addresses can open HQ.
 */
export function HqLogin({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function post(path: string, body: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "That didn't work");
    return data;
  }

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await post("/api/hq/auth/send", { email });
      setDevCode(data.devCode ?? null);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await post("/api/hq/auth/verify", { email, code });
      window.location.assign(data.redirectTo ?? "/hq");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface-muted px-4 py-10">
      <span className="flex items-center gap-2.5">
        <BrandMark size={40} />
        <span className="text-xl font-extrabold">
          Jamavat <span className="font-semibold text-text-muted">HQ</span>
        </span>
      </span>

      {!configured ? (
        <Alert tone="warning" className="max-w-[420px]">
          HQ has no addresses yet. Set HQ_EMAILS on the server to the address that should be able to sign in.
        </Alert>
      ) : step === "email" ? (
        <form onSubmit={sendCode} className="flex w-full max-w-[420px] flex-col gap-4 rounded-3xl border border-border bg-surface p-7">
          <h1 className="text-[22px] font-extrabold tracking-tight">Sign in</h1>
          <TextField
            label="Your email"
            hint="We'll email you a 6-digit code."
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" size="lg" disabled={busy || !email}>
            {busy ? "Sending…" : "Email me a code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex w-full max-w-[420px] flex-col gap-4 rounded-3xl border border-border bg-surface p-7">
          <h1 className="text-[22px] font-extrabold tracking-tight">Enter the code</h1>
          <p className="text-[15px] text-text-muted">Sent to {email}, if that address can open HQ.</p>
          {devCode ? <Alert tone="info">Development only — your code is {devCode}</Alert> : null}
          <TextField
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputClassName="text-center text-xl tracking-[0.5em]"
            required
          />
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Sign in"}
          </Button>
          <Button variant="link" size="inline" onClick={() => setStep("email")} className="self-start">
            Use a different address
          </Button>
        </form>
      )}
    </div>
  );
}
