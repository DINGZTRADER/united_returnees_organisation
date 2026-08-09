import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { MemberProfileManager } from "@/components/MemberProfileManager";
import { MembershipPaymentButton } from "@/components/MembershipPaymentButton";
import { SupportRequestForm } from "@/components/SupportRequestForm";
import { createClient } from "@/lib/supabase/server";
import styles from "./dashboard.module.css";

export const metadata = { title: "Member Dashboard", robots: { index: false, follow: false } };

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
    supabase.from("support_requests").select("id,created_at,category,subject,status").eq("member_id", user.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("opportunities").select("id,title,category,summary,source_url,expires_at").eq("published", true).order("created_at", { ascending: false }).limit(6),
    supabase.from("membership_applications").select("id,status,reviewed_at,review_note,support_needs").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("memberships").select("id,status,period_start,period_end,paid_at,payment_reference").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
    supabase.from("payment_transactions").select("id,created_at,tx_ref,amount,currency,status,payment_type").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("membership_receipts").select("id,receipt_number,amount,currency,issued_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const profile = profileResult.data;
  const supportRequests = supportResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];
  const application = applicationResult.data;
  const memberships = membershipsResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const receipts = receiptsResult.data ?? [];

  let photoUrl: string | null = null;
  if (profile?.profile_photo_path) {
    const { data } = await supabase.storage.from("member-photos").createSignedUrl(profile.profile_photo_path, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  const expiry = profile?.membership_expires_at ? new Date(profile.membership_expires_at) : null;
  const expiredByDate = Boolean(expiry && expiry.getTime() < Date.now());
  const effectiveMembershipStatus = expiredByDate && profile?.membership_status === "active" ? "expired" : (profile?.membership_status ?? "pending");
  const hasPriorMembership = memberships.length > 0;
  const profileReady = Boolean(profile?.profile_photo_path);
  const canPay = profileReady && (expiredByDate || (!hasPriorMembership && application?.status === "approved" && effectiveMembershipStatus !== "active"));
  const isActive = effectiveMembershipStatus === "active" && !expiredByDate;
  const verificationUrl = profile?.member_number ? `https://uro-modern-prototype.vercel.app/verify/${encodeURIComponent(profile.member_number)}` : null;
  const qrUrl = verificationUrl ? `https://quickchart.io/qr?size=180&margin=1&text=${encodeURIComponent(verificationUrl)}` : null;

  const profileInitial = {
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    current_country: profile?.current_country ?? "",
    return_status: profile?.return_status ?? "planning",
    return_date: profile?.return_date ?? "",
    district: profile?.district ?? "",
    professional_background: profile?.professional_background ?? "",
    skills: profile?.skills ?? "",
    business_interests: profile?.business_interests ?? "",
    investment_interests: profile?.investment_interests ?? "",
    support_needs: profile?.support_needs ?? application?.support_needs ?? "",
  };

  return (
    <section className="section dashboard-page">
      <div className="container">
        <div className="dash-head">
          <div>
            <span className="eyebrow">Member Dashboard</span>
            <h1>Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1>
            <p>Your return journey, URO support and annual membership in one place.</p>
          </div>
          <div className="dash-actions"><span className={`status-pill ${isActive ? "live" : ""}`}>{label(effectiveMembershipStatus)}</span><LogoutButton /></div>
        </div>

        <nav className={styles.quickNav} aria-label="Member dashboard sections">
          <a href="#my-profile">My Profile</a><a href="#my-membership">My Membership</a><a href="#opportunities">Opportunities</a><a href="#support">My Support Requests</a><a href="#ask-uro">Ask URO</a>
        </nav>

        <div className="member-summary-grid">
          <article><span>Return status</span><strong>{label(profile?.return_status)}</strong><small>{profile?.current_country || "Country not supplied"}</small></article>
          <article><span>District</span><strong>{profile?.district || "—"}</strong><small>Uganda destination / residence</small></article>
          <article><span>Membership</span><strong>{label(effectiveMembershipStatus)}</strong><small>{expiry ? `Through ${date(profile?.membership_expires_at)}` : "USD 100 annually"}</small></article>
          <article><span>Support cases</span><strong>{supportRequests.length}</strong><small>Most recent six shown</small></article>
        </div>

        <div className="dashboard-columns">
          <div className="dashboard-stack">
            <article className={`dash-card ${styles.profileCard}`} id="my-profile">
              <span>My Profile</span>
              <h3>Returnee profile</h3>
              <p>Keep your details current so URO can match you to relevant support and opportunities.</p>
              <MemberProfileManager initial={profileInitial} photoUrl={photoUrl} active={isActive} />
            </article>

            <article className="dash-card" id="support">
              <span>Support</span>
              <h3>My support requests</h3>
              {supportRequests.length ? <div className="case-list">{supportRequests.map((item) => <div key={item.id}><strong>{item.subject}</strong><span>{item.category} · {label(item.status)}</span></div>)}</div> : <p>No support requests yet.</p>}
              <SupportRequestForm />
            </article>
          </div>

          <div className="dashboard-stack">
            <article className="dash-card membership-status-card" id="my-membership">
              <span>Membership</span>
              <h3>Annual membership</h3>
              {isActive ? (
                <><p>Your membership is active through <strong>{date(profile?.membership_expires_at)}</strong>.</p><strong className="membership-state">Active</strong></>
              ) : !profileReady && application?.status === "approved" ? (
                <p>Your application is approved. Add a profile/passport-size photograph in <strong>My Profile</strong> before membership can be activated.</p>
              ) : canPay ? (
                <><p>{hasPriorMembership ? "Your previous annual period has ended. Renew to keep your URO membership active." : "Your application has been approved. Complete the USD 100 annual membership payment to activate membership."}</p><MembershipPaymentButton renewal={hasPriorMembership} /></>
              ) : application?.status === "approved" ? (
                <p>Your application is approved. Payment remains on hold while URO confirms its preferred payment arrangements.</p>
              ) : application?.status === "rejected" ? (
                <p>Your application currently requires follow-up with the URO membership desk.</p>
              ) : (
                <p>Your application is awaiting URO review.</p>
              )}
              <Link href="/contact">Contact membership desk</Link>
            </article>

            <article className={`dash-card ${styles.cardWrap}`}>
              <span>Digital Membership Card</span>
              <h3>My URO card</h3>
              {isActive && profile?.member_number && verificationUrl && qrUrl ? (
                <div className={styles.memberCard}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardBrand}><span>United Returnees Organisation</span><strong>Official Member</strong></div>
                    {photoUrl ? <img src={photoUrl} alt={`${profile.full_name} URO profile`} /> : null}
                  </div>
                  <div className={styles.cardBody}>
                    <div>
                      <h3>{profile.full_name}</h3>
                      <p>{profile.member_number}</p>
                      <div className={styles.cardMeta}><div><span>Status</span><strong>Active</strong></div><div><span>Valid until</span><strong>{date(profile.membership_expires_at)}</strong></div></div>
                      <a className={styles.verifyLink} href={verificationUrl}>Open public verification</a>
                    </div>
                    <div className={styles.qr}><img src={qrUrl} alt="QR code to verify URO membership" /></div>
                  </div>
                </div>
              ) : (
                <div className={styles.locked}><strong>Card available after activation</strong><p>Your digital card and verification code appear when membership is active and your profile photograph is complete.</p></div>
              )}
            </article>

            <article className="dash-card">
              <span>Receipts</span>
              <h3>Membership receipts</h3>
              {receipts.length ? <div className="case-list">{receipts.map((item) => <div key={item.id}><strong>{item.receipt_number}</strong><span>{item.currency} {Number(item.amount).toFixed(2)} · {date(item.issued_at)}</span><Link href={`/receipt/${item.id}`}>View receipt</Link></div>)}</div> : <p>Your verified membership-payment receipts will appear here.</p>}
            </article>

            <article className="dash-card" id="opportunities">
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
