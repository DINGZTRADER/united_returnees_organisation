"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirm_password") ?? "");

    if (password.length < 8) {
      setMessage("Use a password of at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The two passwords do not match.");
      return;
    }

    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage("The reset session is invalid or has expired. Request a new password reset link.");
      setBusy(false);
      return;
    }

    form.reset();
    setDone(true);
    setMessage("Password updated successfully. You can continue to your member dashboard.");
    setBusy(false);
  }

  return (
    <form className="form-card login-card" onSubmit={submit}>
      <label>
        New password
        <input type="password" name="password" minLength={8} required autoComplete="new-password" />
      </label>
      <label>
        Confirm new password
        <input type="password" name="confirm_password" minLength={8} required autoComplete="new-password" />
      </label>
      <button className="button" disabled={busy || done}>{busy ? "Updating…" : done ? "Password updated" : "Update password"}</button>
      {message && <p className={`form-message ${done ? "done" : "fallback"}`}>{message}</p>}
      {done && <a className="text-link" href="/dashboard">Continue to dashboard</a>}
    </form>
  );
}
