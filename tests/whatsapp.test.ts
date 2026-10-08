import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidSignature, parseWebhook } from "@/lib/whatsapp/webhook";
import { formatWaNumber, normalizeWaNumber } from "@/lib/whatsapp/phone";
import { whatsappSendSchema } from "@/lib/validation/whatsapp";
import { canAccessPage } from "@/lib/auth/access";

const textWebhook = (overrides: Record<string, unknown> = {}) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "3345318119008115",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "919000000000", phone_number_id: "1334079909791512" },
            contacts: [{ profile: { name: "Asha Patel" }, wa_id: "919876543210" }],
            messages: [{ from: "919876543210", id: "wamid.TEST1", timestamp: "1791460000", type: "text", text: { body: "Hello" } }],
            ...overrides,
          },
        },
      ],
    },
  ],
});

describe("webhook parsing", () => {
  it("reads a text message with sender, name, ids and time", () => {
    const { messages, statuses } = parseWebhook(textWebhook());
    expect(statuses).toEqual([]);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      whatsappMessageId: "wamid.TEST1",
      waId: "919876543210",
      profileName: "Asha Patel",
      messageType: "text",
      text: "Hello",
      phoneNumberId: "1334079909791512",
      wabaId: "3345318119008115",
    });
    expect(messages[0].timestamp.toISOString()).toBe(new Date(1791460000 * 1000).toISOString());
  });

  it("labels non-text messages for the inbox and keeps media ids", () => {
    const { messages } = parseWebhook(
      textWebhook({
        messages: [
          { from: "919876543210", id: "wamid.IMG", timestamp: "1791460001", type: "image", image: { id: "media-1", mime_type: "image/jpeg", caption: "Menu?" } },
          { from: "919876543210", id: "wamid.AUD", timestamp: "1791460002", type: "audio", audio: { id: "media-2" } },
          { from: "919876543210", id: "wamid.LOC", timestamp: "1791460003", type: "location", location: { latitude: 23.02, longitude: 72.57 } },
        ],
      })
    );
    expect(messages.map((message) => message.text)).toEqual(["Menu?", "[audio]", "[location] 23.02, 72.57"]);
    expect(messages[0].media).toEqual({ id: "media-1", mimeType: "image/jpeg" });
  });

  it("reads delivery statuses, including Meta's error on failure", () => {
    const { statuses, messages } = parseWebhook(
      textWebhook({
        messages: undefined,
        statuses: [
          { id: "wamid.OUT1", status: "read", timestamp: "1791460100", recipient_id: "919876543210" },
          { id: "wamid.OUT2", status: "failed", timestamp: "1791460101", recipient_id: "919876543210", errors: [{ code: 131047, title: "Re-engagement message", error_data: { details: "More than 24 hours have passed" } }] },
          { id: "wamid.OUT3", status: "weird", timestamp: "1791460102" },
        ],
      })
    );
    expect(messages).toEqual([]);
    expect(statuses.map((status) => status.status)).toEqual(["read", "failed"]);
    expect(statuses[1].error).toEqual({ code: 131047, title: "Re-engagement message", message: "More than 24 hours have passed" });
  });

  it("ignores other objects, other fields and broken entries without throwing", () => {
    expect(parseWebhook({ object: "page", entry: [] }).messages).toEqual([]);
    expect(parseWebhook(null).messages).toEqual([]);
    const odd = parseWebhook({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "account_update", value: {} }, "junk", { field: "messages", value: { metadata: {} } }] }] });
    expect(odd).toEqual({ messages: [], statuses: [], skipped: 3 });
    const noId = parseWebhook(textWebhook({ messages: [{ from: "919876543210", type: "text", text: { body: "x" } }, { id: "wamid.X", from: "abc", type: "text" }] }));
    expect(noId.messages).toEqual([]);
  });
});

describe("webhook signature", () => {
  const secret = "test-app-secret";
  const body = JSON.stringify(textWebhook());
  const header = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  it("accepts Meta's HMAC of the raw body", () => {
    expect(isValidSignature(body, header, secret)).toBe(true);
  });

  it("rejects a changed body, a wrong secret or a missing header", () => {
    expect(isValidSignature(body.replace("Hello", "Hullo"), header, secret)).toBe(false);
    expect(isValidSignature(body, header, "other-secret")).toBe(false);
    expect(isValidSignature(body, null, secret)).toBe(false);
    expect(isValidSignature(body, "sha256=abc", secret)).toBe(false);
  });
});

describe("WhatsApp numbers", () => {
  it("normalises to digits and refuses non-numbers", () => {
    expect(normalizeWaNumber("+91 98765-43210")).toBe("919876543210");
    expect(normalizeWaNumber("12345")).toBeNull();
    expect(normalizeWaNumber("91abc")).toBeNull();
    expect(normalizeWaNumber(undefined)).toBeNull();
  });

  it("formats Indian numbers for display", () => {
    expect(formatWaNumber("919876543210")).toBe("+91 98765 43210");
    expect(formatWaNumber("14155550123")).toBe("+14155550123");
  });

  it("validates the send request", () => {
    const id = "a".repeat(24);
    expect(whatsappSendSchema.safeParse({ conversationId: id, message: "Hi" }).success).toBe(true);
    expect(whatsappSendSchema.safeParse({ conversationId: id, message: "   " }).success).toBe(false);
    expect(whatsappSendSchema.safeParse({ conversationId: id, message: "x".repeat(4097) }).success).toBe(false);
    expect(whatsappSendSchema.safeParse({ conversationId: "nope", message: "Hi" }).success).toBe(false);
    expect(whatsappSendSchema.safeParse({ conversationId: id, to: "drop table", message: "Hi" }).success).toBe(false);
  });
});

describe("inbox access", () => {
  it("is for admin and counter, not the kitchen", () => {
    expect(canAccessPage("ADMIN", "/whatsapp")).toBe(true);
    expect(canAccessPage("COUNTER", "/whatsapp")).toBe(true);
    expect(canAccessPage("KITCHEN", "/whatsapp")).toBe(false);
  });
});

describe("WhatsApp env settings", () => {
  const KEYS = ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN", "WHATSAPP_GRAPH_API_VERSION"] as const;
  const withEnv = async (values: Partial<Record<(typeof KEYS)[number], string>>, check: () => Promise<void> | void) => {
    const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
    for (const key of KEYS) delete process.env[key];
    Object.assign(process.env, values);
    try {
      await check();
    } finally {
      for (const key of KEYS) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  };

  it("names (never shows) what's missing for sending", async () => {
    const { missingSendVars, getSendConfig } = await import("@/lib/whatsapp/config");
    await withEnv({}, () => {
      expect(missingSendVars()).toEqual(["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"]);
      expect(getSendConfig()).toBeNull();
    });
    await withEnv({ WHATSAPP_ACCESS_TOKEN: "secret-value", WHATSAPP_PHONE_NUMBER_ID: "1334079909791512" }, () => {
      expect(missingSendVars()).toEqual([]);
      expect(getSendConfig()).toMatchObject({ phoneNumberId: "1334079909791512", graphVersion: "v26.0" });
    });
    await withEnv({ WHATSAPP_ACCESS_TOKEN: "x", WHATSAPP_PHONE_NUMBER_ID: "1", WHATSAPP_GRAPH_API_VERSION: "v27.0" }, () => {
      expect(getSendConfig()?.graphVersion).toBe("v27.0");
    });
  });

  it("refuses webhook verification when the verify token isn't set", async () => {
    const { GET } = await import("@/app/api/whatsapp/webhook/route");
    const url = "https://x.test/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=42";
    await withEnv({}, async () => {
      expect((await GET(new Request(url))).status).toBe(403);
    });
    await withEnv({ WHATSAPP_VERIFY_TOKEN: "abc" }, async () => {
      const res = await GET(new Request(`${url}&hub.verify_token=abc`));
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("42");
      expect((await GET(new Request(`${url}&hub.verify_token=wrong`))).status).toBe(403);
    });
  });
});
