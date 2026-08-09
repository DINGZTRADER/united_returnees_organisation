import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = { title: "Reset Password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <section className="section auth-page">
      <div className="container auth-shell">
        <div>
          <span className="eyebrow">Member Portal</span>
          <h1>Reset your password.</h1>
          <p>Enter the email attached to your URO account and we will send a secure reset link.</p>
          <p className="muted">Remembered your password? <Link href="/login">Return to sign in</Link>.</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </section>
  );
}
