import { redirect } from "next/navigation";
import { AdminApplications } from "@/components/AdminApplications";
import { AdminBriefingManager, type AdminBriefingItem } from "@/components/AdminBriefingManager";
import { AdminConciergeAnalytics, type AdminConciergeQuestion } from "@/components/AdminConciergeAnalytics";
import { AdminKnowledgeManager, type AdminKnowledgeArticle } from "@/components/AdminKnowledgeManager";
import { AdminMemberDirectory, type AdminMember } from "@/components/AdminMemberDirectory";
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
  const analyticsCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const [registered, activeMembers, planning, returned, openSupport, approvedAwaitingPayment, applications, briefingItems, knowledgeArticles, conciergeQuestions, memberProfiles] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("membership_status", "active").gte("membership_expires_at", now),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("return_status", "planning"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("return_status", "returned"),
    supabase.from("support_requests").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase.from("membership_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("membership_applications").select("id,created_at,full_name,email,phone,current_country,return_status,district,support_needs,status").order("created_at", { ascending: false }).limit(30),
    supabase.from("briefing_items").select("id,kind,category,title,summary,source_name,source_url,cta_label,published_at,verified_at,expires_at,priority,published,created_at").order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(100),
    supabase.from("knowledge_articles").select("id,slug,category,question,answer,keywords,source_name,source_url,source_kind,priority,published,verified_at,review_after,created_at").order("priority", { ascending: false }).order("verified_at", { ascending: false }).limit(150),
    supabase.from("concierge_questions").select("id,question_redacted,page_path,grounded,confidence,category,matched_article_id,review_status,reviewed_at,created_at").gte("created_at", analyticsCutoff).order("created_at", { ascending: false }).limit(1000),
    supabase.from("profiles").select("id,full_name,email,phone,current_country,return_status,district,professional_background,skills,support_needs,membership_status,membership_expires_at,member_number,profile_photo_path").order("created_at", { ascending: false }).limit(250),
  ]);

  const membersWithPhotos: AdminMember[] = await Promise.all((memberProfiles.data ?? []).map(async (item) => {
    let profile_photo_url: string | null = null;
    if (item.profile_photo_path) {
      const { data } = await supabase.storage.from("member-photos").createSignedUrl(item.profile_photo_path, 3600);
      profile_photo_url = data?.signedUrl ?? null;
    }
    return { ...item, profile_photo_url } as AdminMember;
  }));

  const analytics = (conciergeQuestions.data ?? []) as AdminConciergeQuestion[];
  const openUnanswered = analytics.filter((item) => !item.grounded && item.review_status === "open").length;
  const metrics = [
    ["Registered accounts", registered.count ?? 0],
    ["Active members", activeMembers.count ?? 0],
    ["Concierge knowledge", (knowledgeArticles.data ?? []).filter((item) => item.published).length],
    ["Concierge gaps", openUnanswered],
    ["Planning to return", planning.count ?? 0],
    ["Already returned", returned.count ?? 0],
    ["Open support requests", openSupport.count ?? 0],
    ["Approved / payment due", approvedAwaitingPayment.count ?? 0],
  ] as const;

  return (
    <section className="section dashboard-page admin-page">
      <div className="container">
        <div className="dash-head">
          <div><span className="eyebrow">URO Administration</span><h1>Returnee intelligence dashboard</h1><p>Signed in as {profile.full_name}. Manage members, applications, public briefings, visitor demand signals, verified concierge knowledge and operational support from one place.</p></div>
          <div className="dash-actions"><span className="status-pill live">{profile.role}</span><LogoutButton /></div>
        </div>
        <div className="metrics">{metrics.map(([name, value]) => <article key={name}><span>{name}</span><strong>{value}</strong></article>)}</div>

        <section className="admin-panel">
          <div className="panel-heading"><div><span className="eyebrow">Member register</span><h2>Profiles & membership cards</h2></div><p>Search the member register, review returnee details, manage membership status and export the current register. Active membership requires a profile photograph and expiry date.</p></div>
          <AdminMemberDirectory initialMembers={membersWithPhotos} />
        </section>

        <section className="admin-panel">
          <div className="panel-heading"><div><span className="eyebrow">Membership pipeline</span><h2>Applications</h2></div><p>Approval records membership eligibility. A profile photo is required before final activation. Payment activation remains on hold until URO confirms its preferred payment arrangements.</p></div>
          <AdminApplications initialApplications={applications.data ?? []} />
        </section>

        <section className="admin-panel">
          <div className="panel-heading"><div><span className="eyebrow">Ask URO intelligence</span><h2>Visitor questions & knowledge gaps</h2></div><p>See what returnees actually ask, measure verified-answer coverage and review questions the concierge could not answer from approved sources.</p></div>
          <AdminConciergeAnalytics initialItems={analytics} />
        </section>

        <section className="admin-panel">
          <div className="panel-heading"><div><span className="eyebrow">News & opportunities</span><h2>Returnee briefing manager</h2></div><p>Add, edit, prioritise and publish verified Uganda updates and opportunities. Expired items automatically disappear from the public briefing.</p></div>
          <AdminBriefingManager initialItems={(briefingItems.data ?? []) as AdminBriefingItem[]} />
        </section>

        <section className="admin-panel" id="concierge-knowledge">
          <div className="panel-heading"><div><span className="eyebrow">Ask URO</span><h2>Verified concierge knowledge</h2></div><p>Control the answers the public concierge is allowed to give. Every published answer should have a URO-approved or official source and a review date for information that can change.</p></div>
          <AdminKnowledgeManager initialItems={(knowledgeArticles.data ?? []) as AdminKnowledgeArticle[]} />
        </section>

        <div className="dashboard-grid admin-secondary-grid">
          <article className="dash-card"><span>Members</span><h3>Profile completeness</h3><p>{membersWithPhotos.filter((item) => item.profile_photo_url).length} of {membersWithPhotos.length} registered profiles currently have a membership photograph.</p></article>
          <article className="dash-card"><span>Concierge</span><h3>Verified answers</h3><p>{(knowledgeArticles.data ?? []).filter((item) => item.published).length} reviewed knowledge articles are currently available to Ask URO, with {openUnanswered} unanswered question{openUnanswered === 1 ? "" : "s"} awaiting review.</p></article>
          <article className="dash-card"><span>Support</span><h3>Case management</h3><p>{openSupport.count ?? 0} open or in-progress support requests. Staff access remains restricted by database policy.</p></article>
          <article className="dash-card"><span>Payments</span><h3>Held for confirmation</h3><p>Payment activation remains separate from the current membership and information workflow until URO confirms its preferred provider.</p></article>
        </div>
      </div>
    </section>
  );
}
