import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { MembershipPaymentButton } from "@/components/MembershipPaymentButton";
import { SupportRequestForm } from "@/components/SupportRequestForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Member Dashboard" };

function label(value: string | null | undefined) {
  if (!value) return "Not supplied";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function date(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [profileResult, supportResult, opportunitiesResult, applicationResult, membershipsResult, paymentsResult, receiptsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("support_requests").select("id,created_at,category,subject,status").order("created_at", { ascending: false }).limit(6),
    supabase.from("opportunities").select("id,title,category,summary,source_url,expires_at").eq("published", true).order("created_at", { ascending: false }).limit(6),
    supabase.from("membership_applications").select("id,status,reviewed_at,review_note").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("memberships").select("id,status,period_start,period_end,paid_at,payment_reference").order("created_at", { ascending: false }).limit(4),
    supabase.from("payment_transactions").select("id,created_at,tx_ref,amount,currency,status,payment_type").order("created_at", { ascending: false }).limit(5),
    supabase.from("membership_receipts").select("id,receipt_number,amount,currency,issued_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const profile = profileResult.data;
  const supportRequests = supportResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];
  const application = applicationResult.data;
  const memberships = membershipsResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const receipts = receiptsResult.data ?? [];

  const expiry = profile?.membership_expires_at ? new Date(profile.membership_expires_at) : null;
  const expiredByDate = Boolean(expiry && expiry.getTime() < Date.now());
  const effectiveMembershipStatus = expiredByDate && profile?.membership_status === "active" ? "expired" : (profile?.membership_status ?? "pending");
  const hasPriorMembership = memberships.length > 0;
  const canPay = expiredByDate || (!hasPriorMembership && application?.status === "approved" && effectiveMembershipStatus !== "active");

  return (
    <section className="section dashboard-page">
      <div className="container">
        <div className="dash-head">
          <div>
            <span className="eyebrow">Member Dashboard</span>
            <h1>Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1>
            <p>Your return journey, URO support and annual membership in one place.</p>
          </div>
          <div className="dash-actions"><span className={`status-pill ${effectiveMembershipStatus === "active" ? "live" : ""}`}>{label(effectiveMembershipStatus)}</span><LogoutButton /></div>
        </div>

        <div className="member-summary-grid">
          <article><span>Return status</span><strong>{label(profile?.return_status)}</strong><small>{profile?.current_country || "Country not supplied"}</small></article>
          <article><span>District</span><strong>{profile?.district || "—"}</strong><small>Uganda destination / residence</small></article>
          <article><span>Membership</span><strong>{label(effectiveMembershipStatus)}</strong><small>{expiry ? `Through ${date(profile?.membership_expires_at)}` : "USD 100 annually"}</small></article>
          <article><span>Support cases</span><strong>{supportRequests.length}</strong><small>Most recent six shown</small></article>
        </div>

        <div className="dashboard-columns">
          <div className="dashboard-stack">
            <article className="dash-card">
              <span>Profile</span>
              <h3>Returnee profile</h3>
              <dl className="profile-list">
                <div><dt>Email</dt><dd>{profile?.email ?? user.email}</dd></div>
                <div><dt>Phone</dt><dd>{profile?.phone || "Not supplied"}</dd></div>
                <div><dt>Professional background</dt><dd>{profile?.professional_background || "Not supplied"}</dd></div>
                <div><dt>Skills</dt><dd>{profile?.skills || "Not supplied"}</dd></div>
              </dl>
            </article>

            <article className="dash-card">
              <span>Support</span>
              <h3>My support requests</h3>
              {supportRequests.length ? <div className="case-list">{supportRequests.map((item) => <div key={item.id}><strong>{item.subject}</strong><span>{item.category} · {label(item.status)}</span></div>)}</div> : <p>No support requests yet.</p>}
              <SupportRequestForm />
            </article>
          </div>

          <div className="dashboard-stack">
            <article className="dash-card membership-status-card">
              <span>Membership</span>
              <h3>Annual membership</h3>
              {effectiveMembershipStatus === "active" && !expiredByDate ? (
                <><p>Your membership is active through <strong>{date(profile?.membership_expires_at)}</strong>.</p><strong className="membership-state">Active</strong></>
              ) : canPay ? (
                <><p>{hasPriorMembership ? "Your previous annual period has ended. Renew to keep your URO membership active." : "Your application has been approved. Complete the USD 100 annual membership payment to activate membership."}</p><MembershipPaymentButton renewal={hasPriorMembership} /></>
              ) : application?.status === "approved" ? (
                <p>Your application is approved. If the payment button is not available, contact the URO membership desk.</p>
              ) : application?.status === "rejected" ? (
                <p>Your application currently requires follow-up with the URO membership desk.</p>
              ) : (
                <p>Your application is awaiting URO review. Payment becomes available after approval.</p>
              )}
              <Link href="/contact">Contact membership desk</Link>
            </article>

            <article className="dash-card">
              <span>Receipts</span>
              <h3>Membership receipts</h3>
              {receipts.length ? <div className="case-list">{receipts.map((item) => <div key={item.id}><strong>{item.receipt_number}</strong><span>{item.currency} {Number(item.amount).toFixed(2)} · {date(item.issued_at)}</span><Link href={`/receipt/${item.id}`}>View receipt</Link></div>)}</div> : <p>Your verified membership-payment receipts will appear here.</p>}
            </article>

            <article className="dash-card">
              <span>Payments</span>
              <h3>Recent payment activity</h3>
              {payments.length ? <div className="case-list">{payments.map((item) => <div key={item.id}><strong>{item.currency} {Number(item.amount).toFixed(2)}</strong><span>{label(item.status)} · {date(item.created_at)}</span></div>)}</div> : <p>No membership payments recorded yet.</p>}
            </article>

            <article className="dash-card">
              <span>Opportunities</span>
              <h3>Current opportunities</h3>
              {opportunities.length ? <div className="opportunity-list">{opportunities.map((item) => <div key={item.id}><strong>{item.title}</strong><span>{item.category}</span><p>{item.summary}</p>{item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer">Open source</a>}</div>)}</div> : <p>Published jobs, programmes, events and partner opportunities will appear here.</p>}
              <Link href="/resources">Browse returnee resources</Link>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
