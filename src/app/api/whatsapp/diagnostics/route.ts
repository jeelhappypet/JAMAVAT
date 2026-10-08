import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getAppSecret, getSendConfig, getVerifyToken, missingSendVars } from "@/lib/whatsapp/config";
import { graphRequest } from "@/lib/whatsapp/graph";

/**
 * Admin-only WhatsApp connection check, using the server's own token:
 * is the token valid, can it see our number and account, is the number
 * connected, which apps are subscribed to the account's webhooks (and with
 * which callback override). Meta's answers are returned as-is; the token never is.
 *
 * POST re-subscribes this app to the account's webhooks (POST /{WABA}/subscribed_apps).
 */
export async function GET() {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;

  const config = getSendConfig();
  const env = {
    missing: missingSendVars(),
    verifyTokenSet: Boolean(getVerifyToken()),
    appSecretSet: Boolean(getAppSecret()),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || null,
    graphVersion: config?.graphVersion ?? null,
  };
  if (!config) return NextResponse.json({ env });

  const waba = config.businessAccountId;
  const [token, phone, account, subscribedApps] = await Promise.all([
    graphRequest(config, "me?fields=id,name"),
    graphRequest(
      config,
      `${config.phoneNumberId}?fields=display_phone_number,verified_name,status,platform_type,code_verification_status,name_status,quality_rating,account_mode,webhook_configuration`
    ),
    waba ? graphRequest(config, `${waba}?fields=id,name,account_review_status,owner_business_info`) : Promise.resolve(null),
    waba ? graphRequest(config, `${waba}/subscribed_apps`) : Promise.resolve(null),
  ]);

  return NextResponse.json({ env, token, phone, account, subscribedApps });
}

export async function POST() {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const config = getSendConfig();
  if (!config?.businessAccountId) return NextResponse.json({ error: "WHATSAPP_ACCESS_TOKEN / WHATSAPP_BUSINESS_ACCOUNT_ID missing" }, { status: 503 });

  const subscribe = await graphRequest(config, `${config.businessAccountId}/subscribed_apps`, "POST");
  const after = await graphRequest(config, `${config.businessAccountId}/subscribed_apps`);
  console.info(JSON.stringify({ scope: "whatsapp.diagnostics", event: "resubscribe", ok: subscribe.ok }));
  return NextResponse.json({ subscribe, subscribedApps: after });
}
