"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./member-profile.module.css";

type ProfileInput = {
  full_name: string;
  phone: string;
  current_country: string;
  return_status: string;
  return_date: string;
  district: string;
  professional_background: string;
  skills: string;
  business_interests: string;
  investment_interests: string;
  support_needs: string;
};

export function MemberProfileManager({ initial, photoUrl, active }: { initial: ProfileInput; photoUrl: string | null; active: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function field<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "Profile update failed.");
      return;
    }
    setMessage("Profile updated.");
    router.refresh();
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    setError("");
    const data = new FormData();
    data.append("photo", file);
    const response = await fetch("/api/profile", { method: "POST", body: data });
    const body = await response.json().catch(() => ({}));
    setUploading(false);
    if (!response.ok) {
      setError(body.error ?? "Photo upload failed.");
      return;
    }
    setMessage("Profile photo updated.");
    router.refresh();
  }

  return (
    <div className={styles.manager}>
      <div className={styles.photoRow}>
        <div className={styles.photoFrame}>
          {photoUrl ? <img src={photoUrl} alt="Your URO profile" /> : <span>{initial.full_name?.slice(0, 1).toUpperCase() || "U"}</span>}
        </div>
        <div>
          <strong>Profile / passport-size photo</strong>
          <p>{active ? "Your active membership profile should always keep a current photograph." : "Required before final membership activation. A passport document is not required."}</p>
          <label className={styles.uploadButton}>
            {uploading ? "Uploading…" : photoUrl ? "Replace photo" : "Add photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => uploadPhoto(event.target.files?.[0])} />
          </label>
          <small>JPG, PNG or WebP. Maximum 5 MB.</small>
        </div>
      </div>

      <form className={styles.form} onSubmit={save}>
        <div className={styles.grid}>
          <label>Full name<input value={form.full_name} required minLength={2} maxLength={120} onChange={(e) => field("full_name", e.target.value)} /></label>
          <label>Phone / WhatsApp<input value={form.phone} maxLength={40} onChange={(e) => field("phone", e.target.value)} /></label>
          <label>Current country<input value={form.current_country} maxLength={100} onChange={(e) => field("current_country", e.target.value)} /></label>
          <label>Return status<select value={form.return_status} onChange={(e) => field("return_status", e.target.value)}><option value="planning">Planning to return</option><option value="returned">Already returned</option></select></label>
          <label>Return date<input type="date" value={form.return_date} onChange={(e) => field("return_date", e.target.value)} /></label>
          <label>District in Uganda<input value={form.district} maxLength={100} onChange={(e) => field("district", e.target.value)} /></label>
        </div>
        <label>Professional background<textarea rows={3} maxLength={1200} value={form.professional_background} onChange={(e) => field("professional_background", e.target.value)} /></label>
        <label>Skills<textarea rows={3} maxLength={1200} value={form.skills} onChange={(e) => field("skills", e.target.value)} /></label>
        <div className={styles.grid}>
          <label>Business interests<textarea rows={3} maxLength={1200} value={form.business_interests} onChange={(e) => field("business_interests", e.target.value)} /></label>
          <label>Investment interests<textarea rows={3} maxLength={1200} value={form.investment_interests} onChange={(e) => field("investment_interests", e.target.value)} /></label>
        </div>
        <label>Support interests / needs<textarea rows={3} maxLength={2000} value={form.support_needs} onChange={(e) => field("support_needs", e.target.value)} /></label>
        {message && <p className="form-message done">{message}</p>}
        {error && <p className="form-message fallback">{error}</p>}
        <button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
      </form>
    </div>
  );
}
