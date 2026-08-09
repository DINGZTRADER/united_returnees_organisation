"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function safeInternalPath(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage("Email or password is incorrect, or the account has not yet been confirmed.");
      setBusy(false);
      return;
    }

    const requestedNext = new URLSearchParams(window.location.search).get("next");
    window.location.assign(safeInternalPath(requestedNext));
  }

  return (
    <form className="form-card login-card" onSubmit={submit}>
      <label>
        Email
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input type="password" name="password" required autoComplete="current-password" />
      </label>
      <button className="button" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {message && <p className="form-message fallback">{message}</p>}
    </form>
  );
}
