"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PRODUCTION_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://uro-modern-prototype.vercel.app"
).replace(/\/$/, "");

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const supabase = createClient();

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${PRODUCTION_SITE_URL}/auth/callback?next=/reset-password`,
    });

    setMessage("If that email is registered with URO, a password reset link has been sent. Check your inbox and spam folder.");
    setBusy(false);
  }

  return (
    <form className="form-card login-card" onSubmit={submit}>
      <label>
        Email
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <button className="button" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
      {message && <p className="form-message done">{message}</p>}
    </form>
  );
}
