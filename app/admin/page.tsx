import { redirect } from "next/navigation";
import { AdminApplications } from "@/components/AdminApplications";
import { AdminBriefingManager, type AdminBriefingItem } from "@/components/AdminBriefingManager";
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
  const [registered, activeMembers, planning, returned, openSupport, approvedAwaitingPayment, successfulPayments, applications, briefingItems] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("membership_status", "active").gte("membership_expires_at", now),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("return_status", "planning"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("return_status", "returned"),
    supabase.from("support_requests").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase.from("membership_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("payment_transactions").select("id", { count: "exact", head: true }).eq("status", "successful"),
    supabase.from("membership_applications").select("id,created_at,full_name,email,phone,current_country,return_status,district,support_needs,status").order("created_at", { ascending: false }).limit(30),
    supabase.from("briefing_items").select("id,kind,category,title,summary,source_name,source_url,cta_label,published_at,verified_at,expires_at,priority,published,created_at").order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(100),
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
          <div><span className="eyebrow">URO Administration</span><h1>Returnee intelligence dashboard</h1><p>Signed in as {profile.full_name}. Manage applications, public returnee briefings and operational support from one place.</p></div>
          <div className="dash-actions"><span className="status-pill live">{profile.role}</span><LogoutButton /></div>
        </div>
        <div className="metrics">{metrics.map(([name, value]) => <article key={name}><span>{name}</span><strong>{value}</strong></article>)}</div>

        <section className="admin-panel">
          <div className="panel-heading"><div><span className="eyebrow">News & opportunities</span><h2>Returnee briefing manager</h2></div><p>Add, edit, prioritise and publish verified Uganda updates and opportunities. Expired items automatically disappear from the public briefing.</p></div>
          <AdminBriefingManager initialItems={(briefingItems.data ?? []) as AdminBriefingItem[]} />
        </section>

        <section className="admin-panel">
          <div className="panel-heading"><div><span className="eyebrow">Membership pipeline</span><h2>Applications</h2></div><p>Approval makes the USD 100 payment step available. Membership becomes active only after a payment provider verifies a successful payment.</p></div>
          <AdminApplications initialApplications={applications.data ?? []} />
        </section>

        <div className="dashboard-grid admin-secondary-grid">
          <article className="dash-card"><span>Briefing</span><h3>Published intelligence</h3><p>{(briefingItems.data ?? []).filter((item) => item.published).length} news or opportunity items are currently marked for public display.</p></article>
          <article className="dash-card"><span>Support</span><h3>Case management</h3><p>{openSupport.count ?? 0} open or in-progress support requests. Staff access remains restricted by database policy.</p></article>
          <article className="dash-card"><span>Insights</span><h3>Returnee pipeline</h3><p>{planning.count ?? 0} registered returnees are planning a return and {returned.count ?? 0} are already back in Uganda.</p></article>
          <article className="dash-card"><span>Payments</span><h3>Held for confirmation</h3><p>Payment activation remains separate from the current membership and information workflow until URO confirms its preferred provider.</p></article>
        </div>
      </div>
    </section>
  );
}
