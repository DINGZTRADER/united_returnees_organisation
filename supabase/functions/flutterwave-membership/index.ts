import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Payment service is not configured." }, 503);

  const authorization = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: "Sign in required." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const action = body.action === "verify" ? "verify" : "checkout";

  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("id,email,full_name,phone,membership_status,membership_expires_at")
    .eq("id", user.id).single();
  if (profileError || !profile) return json({ error: "Member profile not found." }, 404);

  if (action === "checkout") {
    const [{ data: application }, { data: latestMembership }] = await Promise.all([
      admin.from("membership_applications").select("status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("memberships").select("status,period_end").eq("user_id", user.id).eq("status", "active").order("period_end", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const currentMembershipActive = Boolean(latestMembership?.status === "active" && latestMembership?.period_end && latestMembership.period_end >= today);
    if (currentMembershipActive) return json({ error: `Membership is already active through ${latestMembership.period_end}.` }, 409);
    const isRenewal = Boolean(latestMembership);
    if (!isRenewal && application?.status !== "approved") return json({ error: "URO must approve your membership application before payment." }, 403);

    const flutterwaveSecret = Deno.env.get("FLW_SECRET_KEY");
    if (!flutterwaveSecret) return json({ error: "Online membership payments are prepared but awaiting URO payment-account activation.", code: "PAYMENTS_NOT_ACTIVATED" }, 503);

    const txRef = `URO-${user.id.slice(0, 8)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const siteUrl = (Deno.env.get("URO_SITE_URL") ?? "https://uro-modern-prototype.vercel.app").replace(/\/$/, "");
    const { data: payment, error: paymentError } = await admin.from("payment_transactions").insert({
      user_id: user.id, provider: "flutterwave", tx_ref: txRef, amount: 100, currency: "USD", status: "pending",
    }).select("id").single();
    if (paymentError || !payment) return json({ error: "Could not create a payment record." }, 500);

    const flwResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${flutterwaveSecret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: 100,
        currency: "USD",
        redirect_url: `${siteUrl}/payment/complete`,
        payment_options: "card",
        customer: { email: profile.email, name: profile.full_name, phonenumber: profile.phone ?? undefined },
        customizations: { title: "URO Annual Membership", description: "United Returnees Organisation annual membership — USD 100" },
        meta: { uro_user_id: user.id, uro_payment_id: payment.id, membership_term: "annual" },
      }),
    });
    const flwBody = await flwResponse.json().catch(() => ({})) as Record<string, any>;
    const link = flwBody?.data?.link as string | undefined;
    if (!flwResponse.ok || flwBody.status !== "success" || !link) {
      await admin.from("payment_transactions").update({ status: "failed", failure_reason: "Checkout creation failed." }).eq("id", payment.id);
      return json({ error: "Payment checkout could not be started. Please try again shortly." }, 502);
    }
    await admin.from("payment_transactions").update({ checkout_url: link }).eq("id", payment.id);
    return json({ ok: true, link, tx_ref: txRef, amount: 100, currency: "USD" });
  }

  const transactionId = String(body.transaction_id ?? "").trim();
  const txRef = String(body.tx_ref ?? "").trim();
  if (!transactionId || !txRef) return json({ error: "Missing transaction details." }, 422);
  const { data: payment } = await admin.from("payment_transactions").select("id,user_id,tx_ref,amount,currency,status")
    .eq("tx_ref", txRef).eq("user_id", user.id).maybeSingle();
  if (!payment) return json({ error: "Payment record not found." }, 404);

  if (payment.status === "successful") {
    const { data: receipt } = await admin.from("membership_receipts").select("id,receipt_number,membership_id").eq("payment_id", payment.id).maybeSingle();
    return json({ ok: true, status: "successful", receipt });
  }

  const flutterwaveSecret = Deno.env.get("FLW_SECRET_KEY");
  if (!flutterwaveSecret) return json({ error: "Payment verification is awaiting URO payment-account activation." }, 503);
  const verifyResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${flutterwaveSecret}` },
  });
  const verifyBody = await verifyResponse.json().catch(() => ({})) as Record<string, any>;
  const data = verifyBody?.data as Record<string, unknown> | undefined;
  if (!verifyResponse.ok || verifyBody.status !== "success" || !data) return json({ error: "We could not verify the payment yet. Please try again shortly." }, 502);

  const verifiedStatus = String(data.status ?? "");
  const verifiedTxRef = String(data.tx_ref ?? "");
  const verifiedCurrency = String(data.currency ?? "").toUpperCase();
  const verifiedAmount = Number(data.amount ?? 0);
  if (verifiedStatus !== "successful" || verifiedTxRef !== txRef || verifiedCurrency !== "USD" || verifiedAmount < 100) {
    await admin.from("payment_transactions").update({
      status: verifiedStatus === "cancelled" ? "cancelled" : "failed",
      provider_transaction_id: transactionId,
      verified_at: new Date().toISOString(),
      failure_reason: "Verification values did not match the expected URO membership payment.",
      raw_verification: safeVerification(data),
    }).eq("id", payment.id);
    return json({ error: "Payment has not been confirmed as a valid USD 100 URO membership payment." }, 409);
  }

  const { data: result, error: finalizeError } = await admin.rpc("finalize_membership_payment", {
    p_tx_ref: txRef,
    p_provider_transaction_id: transactionId,
    p_amount: verifiedAmount,
    p_currency: verifiedCurrency,
    p_payment_type: String(data.payment_type ?? "card"),
    p_verification: safeVerification(data),
  });
  if (finalizeError) return json({ error: "Payment was verified but membership activation needs URO review." }, 500);
  const activation = Array.isArray(result) ? result[0] : result;
  return json({ ok: true, status: "successful", activation });
});
