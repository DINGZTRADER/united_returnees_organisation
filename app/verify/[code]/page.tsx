import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import styles from "./verify.module.css";

export const metadata = { title: "Verify URO Membership", robots: { index: false, follow: false } };

type Verification = { member_number: string; status: string; valid_until: string | null };

function niceDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00Z`));
}

export default async function VerifyMembership({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const memberNumber = decodeURIComponent(code).trim().toUpperCase();
  const validFormat = /^URO-\d{4}-\d{6}$/.test(memberNumber);
  const supabase = await createClient();
  let verification: Verification | null = null;

  if (validFormat) {
    const result = await supabase.rpc("verify_membership", { p_member_number: memberNumber }).maybeSingle();
    verification = (result.data as Verification | null) ?? null;
  }

  const active = verification?.status === "active";

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.mark}>URO</div>
        <span className="eyebrow">Membership verification</span>
        {verification ? <>
          <h1>{active ? "Valid URO Member" : "Membership not active"}</h1>
          <div className={`${styles.status} ${active ? styles.active : styles.inactive}`}>{active ? "Active" : verification.status.replaceAll("_", " ")}</div>
          <dl><div><dt>Member number</dt><dd>{verification.member_number}</dd></div><div><dt>Valid until</dt><dd>{niceDate(verification.valid_until)}</dd></div></dl>
          <p>This verification intentionally displays no phone number, email address or private profile information.</p>
        </> : <>
          <h1>Membership not verified</h1>
          <div className={`${styles.status} ${styles.inactive}`}>Invalid code</div>
          <p>No URO membership record could be verified using this code.</p>
        </>}
        <Link className="button" href="/">Return to URO</Link>
      </div>
    </section>
  );
}
