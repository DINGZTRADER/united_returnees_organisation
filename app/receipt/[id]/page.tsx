import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintReceiptButton } from "@/components/PrintReceiptButton";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";

export const metadata = { title: "Membership Receipt" };

function date(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/receipt/${encodeURIComponent(id)}`);

  const { data: receipt } = await supabase.from("membership_receipts")
    .select("id,user_id,membership_id,receipt_number,amount,currency,payment_reference,provider,issued_at")
    .eq("id", id).maybeSingle();
  if (!receipt) notFound();

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("full_name,email").eq("id", receipt.user_id).maybeSingle(),
    supabase.from("memberships").select("period_start,period_end,status").eq("id", receipt.membership_id).maybeSingle(),
  ]);

  return (
    <section className="section receipt-page">
      <div className="container narrow-container">
        <article className="receipt-card">
          <header className="receipt-header">
            <div><span className="eyebrow">Official membership receipt</span><h1>{SITE.name}</h1><p>{SITE.tagline}</p></div>
            <div className="receipt-number"><span>Receipt</span><strong>{receipt.receipt_number}</strong></div>
          </header>

          <div className="receipt-grid">
            <div><span>Received from</span><strong>{profile?.full_name ?? "URO member"}</strong><small>{profile?.email ?? ""}</small></div>
            <div><span>Issued</span><strong>{date(receipt.issued_at)}</strong><small>Verified electronic payment</small></div>
            <div><span>Amount</span><strong>{receipt.currency} {Number(receipt.amount).toFixed(2)}</strong><small>Annual membership</small></div>
            <div><span>Membership period</span><strong>{date(membership?.period_start)} — {date(membership?.period_end)}</strong><small>Status: {membership?.status ?? "active"}</small></div>
          </div>

          <div className="receipt-reference"><span>Payment reference</span><code>{receipt.payment_reference}</code><small>Provider: {receipt.provider}</small></div>
          <p className="receipt-note">This receipt confirms payment of the URO annual membership fee. It is generated only after server-side payment verification.</p>

          <div className="receipt-actions no-print"><PrintReceiptButton /><Link className="button" href="/dashboard">Member dashboard</Link></div>
        </article>
      </div>
    </section>
  );
}
