"use client";

import { useMemo, useState } from "react";
import styles from "./admin-members.module.css";

export type AdminMember = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  current_country: string | null;
  return_status: string | null;
  district: string | null;
  professional_background: string | null;
  skills: string | null;
  support_needs: string | null;
  membership_status: string;
  membership_expires_at: string | null;
  member_number: string | null;
  profile_photo_url: string | null;
};

function dateInput(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function MemberRow({ item, onUpdate }: { item: AdminMember; onUpdate: (next: AdminMember) => void }) {
  const [status, setStatus] = useState(item.membership_status);
  const [expiry, setExpiry] = useState(dateInput(item.membership_expires_at));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/members/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membership_status: status, membership_expires_at: expiry || null }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error ?? "Update failed.");
      return;
    }
    onUpdate({ ...item, membership_status: body.member.membership_status, membership_expires_at: body.member.membership_expires_at, member_number: body.member.member_number });
    setMessage("Saved");
  }

  return (
    <tr>
      <td>
        <div className={styles.person}>
          <div className={styles.avatar}>{item.profile_photo_url ? <img src={item.profile_photo_url} alt="" /> : <span>{item.full_name.slice(0, 1)}</span>}</div>
          <div><strong>{item.full_name}</strong><small>{item.email}<br />{item.phone || "No phone"}</small></div>
        </div>
      </td>
      <td>{item.return_status === "planning" ? "Planning" : item.return_status === "returned" ? "Returned" : "—"}<small>{item.current_country || "Country not supplied"}<br />{item.district || "District not supplied"}</small></td>
      <td><strong>{item.member_number || "Not assigned"}</strong><small>{item.professional_background || "No professional background"}<br />{item.skills || "No skills listed"}</small></td>
      <td><small>{item.support_needs || "No support needs listed"}</small></td>
      <td>
        <div className={styles.controls}>
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">Pending</option><option value="active">Active</option><option value="expired">Expired</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option></select>
          <input type="date" aria-label="Membership expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          <button type="button" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          {message && <small>{message}</small>}
        </div>
      </td>
    </tr>
  );
}

export function AdminMemberDirectory({ initialMembers }: { initialMembers: AdminMember[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => members.filter((item) => {
    const text = `${item.full_name} ${item.email} ${item.member_number ?? ""} ${item.current_country ?? ""} ${item.district ?? ""}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (status === "all" || item.membership_status === status);
  }), [members, query, status]);

  function update(next: AdminMember) {
    setMembers((items) => items.map((item) => item.id === next.id ? next : item));
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <input placeholder="Search name, email, member number, country…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="active">Active</option><option value="expired">Expired</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option></select>
        <a className="button button-sm" href="/api/admin/members/export">Export CSV</a>
      </div>
      <p className={styles.note}>Activation requires a member photograph and a valid expiry date. Member numbers are assigned automatically the first time a profile becomes active.</p>
      <div className="admin-table-wrap">
        <table className="admin-table"><thead><tr><th>Member</th><th>Return</th><th>Profile</th><th>Support</th><th>Membership</th></tr></thead><tbody>
          {filtered.map((item) => <MemberRow key={item.id} item={item} onUpdate={update} />)}
        </tbody></table>
      </div>
      {!filtered.length && <div className="empty-state">No members match this search.</div>}
    </div>
  );
}
