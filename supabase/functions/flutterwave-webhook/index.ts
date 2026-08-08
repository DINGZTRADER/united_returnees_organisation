import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function hmacBase64(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function safeVerification(data: Record<string, unknown>) {
  return {
    id: data.id ?? null,
    status: data.status ?? null,
    amount: data.amount ?? null,
    currency: data.currency ?? null,
    tx_ref: data.tx_ref ?? null,
    payment_type: data.payment_type ?? null,
    flw_ref: data.flw_ref ?? null,
    created_at: data.created_at ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: true });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const flutterwaveSecret = Deno.env.get("FLW_SECRET_KEY");
  const secretHash = Deno.env.get("FLW_SECRET_HASH");
  if (!supabaseUrl || !serviceRoleKey || !flutterwaveSecret || !secretHash) return json({ error: "Webhook service is not fully configured." }, 503);

  const rawBody = await req.text();
  const modernSignature = req.headers.get("flutterwave-signature");
  const legacySignature = req.headers.get("verif-hash");
  let validSignature = false;
  if (modernSignature) validSignature = constantTimeEqual(modernSignature, await hmacBase64(rawBody, secretHash));
  else if (legacySignature) validSignature = constantTimeEqual(legacySignature, secretHash);
  if (!validSignature) return json({ error: "Invalid signature." }, 401);

  let payload: Record<string, any>;
  try { payload = JSON.parse(rawBody); } catch { return json({ error: "Invalid payload." }, 400); }
  const eventName = String(payload.event ?? payload.type ?? "");
  const eventData = payload.data as Record<string, unknown> | undefined;
  if (!eventData || !["charge.completed", "payment.completed"].includes(eventName)) return json({ ok: true });

  const txRef = String(eventData.tx_ref ?? "").trim();
  const transactionId = String(eventData.id ?? "").trim();
  if (!txRef || !transactionId) return json({ ok: true });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: payment } = await admin.from("payment_transactions").select("id,status,amount,currency").eq("tx_ref", txRef).maybeSingle();
  if (!payment || payment.status === "successful") return json({ ok: true });

  const verifyResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${flutterwaveSecret}` },
  });
  const verifyBody = await verifyResponse.json().catch(() => ({})) as Record<string, any>;
  const verified = verifyBody?.data as Record<string, unknown> | undefined;
  if (!verifyResponse.ok || verifyBody.status !== "success" || !verified) return json({ error: "Verification unavailable." }, 502);

  const status = String(verified.status ?? "");
  const verifiedTxRef = String(verified.tx_ref ?? "");
  const currency = String(verified.currency ?? "").toUpperCase();
  const amount = Number(verified.amount ?? 0);
  if (status !== "successful" || verifiedTxRef !== txRef || currency !== payment.currency || amount < Number(payment.amount)) {
    await admin.from("payment_transactions").update({
      status: status === "cancelled" ? "cancelled" : "failed",
      provider_transaction_id: transactionId,
      verified_at: new Date().toISOString(),
      failure_reason: "Flutterwave verification did not match the expected membership payment.",
      raw_verification: safeVerification(verified),
    }).eq("id", payment.id);
    return json({ ok: true });
  }

  const { error: finalizeError } = await admin.rpc("finalize_membership_payment", {
    p_tx_ref: txRef,
    p_provider_transaction_id: transactionId,
    p_amount: amount,
    p_currency: currency,
    p_payment_type: String(verified.payment_type ?? "card"),
    p_verification: safeVerification(verified),
  });
  if (finalizeError) return json({ error: "Membership finalization failed." }, 500);
  return json({ ok: true });
});
