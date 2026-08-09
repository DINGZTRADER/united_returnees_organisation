import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Member Login", robots: { index: false, follow: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const confirmationError = params.error === "confirmation";

  return (
    <section className="section auth-page">
      <div className="container auth-shell">
        <div>
          <span className="eyebrow">Member Portal</span>
          <h1>Welcome back.</h1>
          <p>Sign in to access your returnee profile, support requests, resources and member opportunities.</p>
          {confirmationError && <p className="form-message fallback">The confirmation link could not be completed. It may have expired or already been used. If your email is already confirmed, sign in normally below.</p>}
          <p className="muted">Not a member yet? <Link href="/join">Join URO</Link>.</p>
        </div>
        <LoginForm />
      </div>
    </section>
  );
}
