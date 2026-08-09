import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import styles from "./verify.module.css";

export const metadata = { title: "Verify URO Membership", robots: { index: false, follow: false } };

function niceDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00Z`));
}

export default async function VerifyMembership({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const memberNumber = decodeURIComponent(code).trim().toUpperCase();
  const validFormat = /^URO-\d{4}-\d{6}$/.test(memberNumber);
  const supabase = await createClient();
  const { data } = validFormat ? await supabase.rpc("verify_membership", { p_member_number: memberNumber }).maybeSingle() : { data: null };
  const active = data?.status === "active";

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.mark}>URO</div>
        <span className="eyebrow">Membership verification</span>
        {data ? <>
          <h1>{active ? "Valid URO Member" : "Membership not active"}</h1>
          <div className={`${styles.status} ${active ? styles.active : styles.inactive}`}>{active ? "Active" : String(data.status).replaceAll("_", " ")}</div>
          <dl><div><dt>Member number</dt><dd>{data.member_number}</dd></div><div><dt>Valid until</dt><dd>{niceDate(data.valid_until)}</dd></div></dl>
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
