import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { SupportRequestForm } from "@/components/SupportRequestForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Member Dashboard" };

function label(value: string | null | undefined) {
  if (!value) return "Not supplied";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [profileResult, supportResult, opportunitiesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("support_requests").select("id,created_at,category,subject,status").order("created_at", { ascending: false }).limit(6),
    supabase.from("opportunities").select("id,title,category,summary,source_url,expires_at").eq("published", true).order("created_at", { ascending: false }).limit(6),
  ]);

  const profile = profileResult.data;
  const supportRequests = supportResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];

  return (
    <section className="section dashboard-page">
      <div className="container">
        <div className="dash-head">
          <div>
            <span className="eyebrow">Member Dashboard</span>
            <h1>Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1>
            <p>Your return journey, membership and URO support in one place.</p>
          </div>
          <div className="dash-actions"><span className={`status-pill ${profile?.membership_status === "active" ? "live" : ""}`}>{label(profile?.membership_status ?? "pending")}</span><LogoutButton /></div>
        </div>

        <div className="member-summary-grid">
          <article><span>Return status</span><strong>{label(profile?.return_status)}</strong><small>{profile?.current_country || "Country not supplied"}</small></article>
          <article><span>District</span><strong>{profile?.district || "—"}</strong><small>Uganda destination / residence</small></article>
          <article><span>Membership</span><strong>{label(profile?.membership_status ?? "pending")}</strong><small>USD 100 annually</small></article>
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
            <article className="dash-card">
              <span>Opportunities</span>
              <h3>Current opportunities</h3>
              {opportunities.length ? <div className="opportunity-list">{opportunities.map((item) => <div key={item.id}><strong>{item.title}</strong><span>{item.category}</span><p>{item.summary}</p>{item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer">Open source</a>}</div>)}</div> : <p>Published jobs, programmes, events and partner opportunities will appear here.</p>}
              <Link href="/resources">Browse returnee resources</Link>
            </article>

            <article className="dash-card membership-status-card">
              <span>Membership</span>
              <h3>Annual status</h3>
              <p>Your account is live. Membership approval and payment are tracked separately so URO can verify each member before activation.</p>
              <strong className="membership-state">{label(profile?.membership_status ?? "pending")}</strong>
              <Link href="/contact">Contact membership desk</Link>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
