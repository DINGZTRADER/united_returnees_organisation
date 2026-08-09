import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = { title: "Choose New Password", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return (
    <section className="section auth-page">
      <div className="container auth-shell">
        <div>
          <span className="eyebrow">Member Portal</span>
          <h1>Choose a new password.</h1>
          <p>Use at least eight characters and keep this password private to your URO account.</p>
          <p className="muted">If your reset link has expired, <Link href="/forgot-password">request a new one</Link>.</p>
        </div>
        <ResetPasswordForm />
      </div>
    </section>
  );
}
