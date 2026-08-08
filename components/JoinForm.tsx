"use client";

import { FormEvent, useState } from "react";
import { SITE } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

export function JoinForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const email = String(data.email ?? "").trim();
    const password = String(data.password ?? "");
    const confirmPassword = String(data.confirm_password ?? "");

    if (password.length < 8) {
      setStatus("error");
      setMessage("Use a password of at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("The two passwords do not match.");
      return;
    }

    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: String(data.full_name ?? ""),
          phone: String(data.phone ?? ""),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (authError || !authData.user) {
      setStatus("error");
      setMessage(authError?.message ?? "We could not create your member account.");
      return;
    }

    const payload = {
      ...data,
      user_id: authData.user.id,
    };
    delete payload.password;
    delete payload.confirm_password;

    const response = await fetch("/api/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus("error");
      setMessage(body.error ?? "Your account was created, but the application could not be saved. Please contact URO.");
      return;
    }

    if (authData.session) {
      window.location.assign("/dashboard");
      return;
    }

    setStatus("done");
    setMessage("Your URO account and membership application have been created. Check your email to confirm the account, then sign in.");
    form.reset();
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-grid">
        <label>Full name<input name="full_name" required autoComplete="name" /></label>
        <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
        <label>Phone / WhatsApp<input name="phone" required autoComplete="tel" /></label>
        <label>Current country<input name="current_country" required /></label>
        <label>
          Return status
          <select name="return_status" required defaultValue="">
            <option value="" disabled>Select one</option>
            <option value="planning">Planning to return</option>
            <option value="returned">Already returned</option>
          </select>
        </label>
        <label>Expected / actual return date<input name="return_date" type="date" /></label>
        <label>District in Uganda<input name="district" /></label>
        <label>Professional background<input name="professional_background" /></label>
        <label>Password<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
        <label>Confirm password<input name="confirm_password" type="password" minLength={8} required autoComplete="new-password" /></label>
      </div>
      <label>Skills and experience<textarea name="skills" rows={3} placeholder="Tell us the skills, qualifications or experience you are bringing home." /></label>
      <label>What support are you looking for?<textarea name="support_needs" rows={4} required placeholder="Employment, business, investment, housing, schools, government services, mentorship…" /></label>
      <label className="check-row"><input type="checkbox" name="consent" value="yes" required /><span>I consent to URO using this information to assess my membership and support needs.</span></label>
      <button className="button" disabled={status === "sending"}>{status === "sending" ? "Creating account…" : `Create account & apply — $${SITE.annualFeeUsd}/year`}</button>
      {message && <p className={`form-message ${status}`}>{message}</p>}
    </form>
  );
}
