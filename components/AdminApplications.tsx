"use client";

import { useState } from "react";

type Application = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  current_country: string;
  return_status: string;
  district: string | null;
  support_needs: string;
  status: string;
};

export function AdminApplications({ initialApplications }: { initialApplications: Application[] }) {
  const [applications, setApplications] = useState(initialApplications);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function review(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    setMessage("");
    const response = await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error ?? "Review failed.");
      setBusyId(null);
      return;
    }
    setApplications((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    setBusyId(null);
  }

  if (!applications.length) return <div className="empty-state">No membership applications yet.</div>;

  return (
    <div className="admin-table-wrap">
      {message && <p className="form-message fallback">{message}</p>}
      <table className="admin-table">
        <thead><tr><th>Applicant</th><th>Return</th><th>Support need</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {applications.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.full_name}</strong><small>{item.email}<br />{item.phone}<br />{item.current_country}</small></td>
              <td>{item.return_status === "planning" ? "Planning" : "Returned"}<small>{item.district || "District not supplied"}</small></td>
              <td>{item.support_needs}</td>
              <td><span className={`status-pill ${item.status === "approved" ? "live" : ""}`}>{item.status}</span></td>
              <td>
                <div className="table-actions">
                  <button type="button" onClick={() => review(item.id, "approved")} disabled={busyId === item.id || item.status === "approved"}>Approve</button>
                  <button type="button" onClick={() => review(item.id, "rejected")} disabled={busyId === item.id || item.status === "rejected"}>Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
