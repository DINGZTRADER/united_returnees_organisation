import { redirect } from "next/navigation";
import { AdminApplications } from "@/components/AdminApplications";
import { LogoutButton } from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };

export default async function Admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id", user.id).maybeSingle();
  if (!profile || !["staff", "admin"].includes(profile.role)) redirect("/dashboard");

  const now = new Date().toISOString();
  const [registered, activeMembers, planning, returned, openSupport, approvedAwaitingPayment, successfulPayments, applications] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("membership_status", "active").gte("membership_expires_at", now),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("return_status", "planning"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("return_status", "returned"),
    supabase.from("support_requests").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase.from("membership_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("payment_transactions").select("id", { count: "exact", head: true }).eq("status", "successful"),
    supabase.from("membership_applications").select("id,created_at,full_name,email,phone,current_country,return_status,district,support_needs,status").order("created_at", { ascending: false }).limit(30),
  ]);

  const metrics = [
    ["Registered accounts", registered.count ?? 0],
    ["Active members", activeMembers.count ?? 0],
    ["Approved / payment due", approvedAwaitingPayment.count ?? 0],
    ["Successful payments", successfulPayments.count ?? 0],
    ["Planning to return", planning.count ?? 0],
    ["Already returned", returned.count ?? 0],
    ["Open support requests", openSupport.count ?? 0],
    ["Applications", applications.data?.length ?? 0],
  ] as const;

  return (
    <section className="section dashboard-page admin-page">
      <div className="container">
        <div className="dash-head">
          <div><span className="eyebrow">URO Administration</span><h1>Returnee intelligence dashboard</h1><p>Signed in as {profile.full_name}. Membership approval, payment verification and annual activation are tracked separately.</p></div>
          <div className="dash-actions"><span className="status-pill live">{profile.role}</span><LogoutButton /></div>
        </div>
        <div className="metrics">{metrics.map(([name, value]) => <article key={name}><span>{name}</span><strong>{value}</strong></article>)}</div>

        <section className="admin-panel">
          <div className="panel-heading"><div><span className="eyebrow">Membership pipeline</span><h2>Applications</h2></div><p>Approval makes the USD 100 payment step available. Membership becomes active only after Flutterwave verifies a successful payment.</p></div>
          <AdminApplications initialApplications={applications.data ?? []} />
        </section>

        <div className="dashboard-grid admin-secondary-grid">
          <article className="dash-card"><span>Payments</span><h3>Verified collections</h3><p>{successfulPayments.count ?? 0} membership payment{successfulPayments.count === 1 ? "" : "s"} verified by the payment provider and recorded by URO.</p></article>
          <article className="dash-card"><span>Support</span><h3>Case management</h3><p>{openSupport.count ?? 0} open or in-progress support requests. Staff access remains restricted by database policy.</p></article>
          <article className="dash-card"><span>Insights</span><h3>Returnee pipeline</h3><p>{planning.count ?? 0} registered returnees are planning a return and {returned.count ?? 0} are already back in Uganda.</p></article>
          <article className="dash-card"><span>Security</span><h3>Payment verification</h3><p>Client redirects never activate membership. Amount, currency, reference and provider status are verified server-side before a receipt is issued.</p></article>
        </div>
      </div>
    </section>
  );
}
