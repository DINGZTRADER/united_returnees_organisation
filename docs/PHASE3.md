# Phase 3 — Payments, renewals and production activation

Phase 3 adds a verified annual membership payment workflow for the USD 100 URO membership fee.

## Payment provider

The implementation uses Flutterwave Standard Checkout for USD card payments. The provider is kept behind Supabase Edge Functions so Flutterwave secret credentials never enter the browser or the GitHub repository.

## Implemented

- Application approval is separate from paid membership activation.
- Approved applicants can start a USD 100 annual payment from the member dashboard.
- Existing members can renew after their annual period expires.
- Checkout creation runs in the authenticated `flutterwave-membership` Edge Function.
- Flutterwave redirect verification runs server-side before activation.
- A signed webhook provides an asynchronous verification path.
- Amount, currency, transaction reference and successful provider status are checked before value is granted.
- Payment finalization is idempotent: a repeated callback/webhook cannot issue a second membership period for the same payment.
- Successful payments create a one-year membership period and an electronic URO receipt.
- Members can view and print/save receipts from their dashboard.
- Payment and receipt tables use RLS: members see only their own records; authorised staff can see operational records.

## Flutterwave activation required

Create/verify URO's Flutterwave merchant account, then configure these Supabase Edge Function secrets in the Supabase project:

- `FLW_SECRET_KEY` — Flutterwave live secret key.
- `FLW_SECRET_HASH` — a new random webhook secret hash chosen by URO.
- `URO_SITE_URL` — `https://uro-modern-prototype.vercel.app` until the final URO domain is connected.

Do not put either Flutterwave secret in `.env`, browser code, GitHub, screenshots, email, or chat.

## Webhook

Configure Flutterwave to send payment webhooks to:

`https://qzzfkebvfsltohxqquza.supabase.co/functions/v1/flutterwave-webhook`

Set the same value used for `FLW_SECRET_HASH` in Flutterwave's webhook settings and enable webhook retries.

## Production flow

1. Applicant creates a URO account and submits the membership application.
2. URO staff approves the application.
3. Member dashboard exposes the USD 100 payment action.
4. Flutterwave hosts the card checkout.
5. Flutterwave redirects to `/payment/complete` and/or calls the webhook.
6. URO re-verifies the transaction server-side with Flutterwave.
7. Only a successful USD payment matching the expected transaction reference and amount is finalized.
8. Membership becomes active for one annual period.
9. The system issues a unique `URO-YYYY-######` receipt.

## Uganda mobile money

Uganda mobile money requires UGX. This release intentionally keeps the contractual membership price at USD 100 and activates USD card checkout first. A later enhancement can add an explicit UGX conversion policy and Uganda MTN/Airtel Money without weakening the USD 100 membership rule.
