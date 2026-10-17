import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * HQ sees every restaurant, so who may open it is decided by the server's
 * own allowlist — never by anything a browser sends.
 */
describe("HQ allowlist", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ADMIN_SESSION_SECRET = "test-secret-for-hq";
  });

  async function load(emails: string | undefined) {
    if (emails === undefined) delete process.env.HQ_EMAILS;
    else process.env.HQ_EMAILS = emails;
    return import("@/lib/hq/session");
  }

  it("is closed when no addresses are set — never open to everyone", async () => {
    const { hqEmails, isHqEmail } = await load(undefined);
    expect(hqEmails()).toEqual([]);
    expect(isHqEmail("anyone@example.com")).toBe(false);
  });

  it("accepts a listed address whatever its spacing or case", async () => {
    const { isHqEmail } = await load(" Owner@Jamavat.app , second@jamavat.app ");
    expect(isHqEmail("owner@jamavat.app")).toBe(true);
    expect(isHqEmail("OWNER@JAMAVAT.APP")).toBe(true);
    expect(isHqEmail("second@jamavat.app")).toBe(true);
    expect(isHqEmail("someone@jamavat.app")).toBe(false);
  });

  it("checks the allowlist again when reading a cookie, so removing an address locks it out at once", async () => {
    const signed = await load("owner@jamavat.app");
    const token = signed.createHqToken("owner@jamavat.app");

    const after = await load("someone-else@jamavat.app");
    const cookie = { get: () => ({ value: token }) };
    vi.doMock("next/headers", () => ({ cookies: async () => cookie }));
    vi.resetModules();
    process.env.HQ_EMAILS = "someone-else@jamavat.app";
    const { getHqEmail } = await import("@/lib/hq/session");
    expect(await getHqEmail()).toBeNull();
    expect(after.isHqEmail("owner@jamavat.app")).toBe(false);
  });

  it("refuses a cookie that was tampered with", async () => {
    const { createHqToken } = await load("owner@jamavat.app");
    const token = createHqToken("owner@jamavat.app");
    const [payload, signature] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ email: "attacker@example.com", iat: Date.now() })).toString("base64url")}.${signature}`;

    vi.doMock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: forged }) }) }));
    vi.resetModules();
    process.env.HQ_EMAILS = "owner@jamavat.app,attacker@example.com";
    const { getHqEmail } = await import("@/lib/hq/session");
    expect(await getHqEmail()).toBeNull();
    expect(payload).toBeTruthy();
  });
});
