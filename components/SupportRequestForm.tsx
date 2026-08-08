"use client";

import { FormEvent, useState } from "react";

export function SupportRequestForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error ?? "Could not create the support request.");
      setBusy(false);
      return;
    }
    form.reset();
    setMessage("Support request created.");
    setTimeout(() => window.location.reload(), 500);
  }

  return (
    <form className="support-form" onSubmit={submit}>
      <label>
        Category
        <select name="category" required defaultValue="">
          <option value="" disabled>Select one</option>
          <option>Employment</option>
          <option>Business & Entrepreneurship</option>
          <option>Investment</option>
          <option>Settlement & Relocation</option>
          <option>Legal & Government Services</option>
          <option>Community & Wellbeing</option>
        </select>
      </label>
      <label>Subject<input name="subject" required maxLength={160} /></label>
      <label>Details<textarea name="details" required rows={4} maxLength={4000} /></label>
      <button className="button button-sm" disabled={busy}>{busy ? "Sending…" : "Request support"}</button>
      {message && <p className="form-message">{message}</p>}
    </form>
  );
}
