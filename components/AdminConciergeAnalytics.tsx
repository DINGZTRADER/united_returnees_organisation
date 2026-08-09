"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./AdminConciergeAnalytics.module.css";

export type AdminConciergeQuestion = {
  id: string;
  question_redacted: string;
  page_path: string;
  grounded: boolean;
  confidence: "low" | "medium" | "high";
  category: string | null;
  matched_article_id: string | null;
  review_status: "open" | "reviewed" | "dismissed";
  reviewed_at: string | null;
  created_at: string;
};

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function AdminConciergeAnalytics({ initialItems }: { initialItems: AdminConciergeQuestion[] }) {
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const last30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return items.filter((item) => new Date(item.created_at).getTime() >= cutoff);
  }, [items]);

  const unanswered = useMemo(
    () => items.filter((item) => !item.grounded && item.review_status === "open"),
    [items],
  );

  const answeredRate = last30.length
    ? Math.round((last30.filter((item) => item.grounded).length / last30.length) * 100)
    : 0;

  const topCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of last30) {
      const category = item.category || "Unclassified";
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [last30]);

  const topQuestions = useMemo(() => {
    const groups = new Map<string, { label: string; count: number; grounded: number }>();
    for (const item of last30) {
      const key = normalise(item.question_redacted);
      const existing = groups.get(key) ?? { label: item.question_redacted, count: 0, grounded: 0 };
      existing.count += 1;
      if (item.grounded) existing.grounded += 1;
      groups.set(key, existing);
    }
    return [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [last30]);

  async function setStatus(item: AdminConciergeQuestion, review_status: AdminConciergeQuestion["review_status"]) {
    setBusyId(item.id);
    setMessage("");
    const response = await fetch("/api/admin/concierge-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, review_status }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(body.error ?? "Could not update the review queue.");
    else setItems((current) => current.map((existing) => existing.id === item.id ? body.item : existing));
    setBusyId(null);
  }

  async function remove(item: AdminConciergeQuestion) {
    if (!window.confirm("Delete this anonymous concierge question from analytics?")) return;
    setBusyId(item.id);
    setMessage("");
    const response = await fetch("/api/admin/concierge-questions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    if (response.ok) setItems((current) => current.filter((existing) => existing.id !== item.id));
    else setMessage("Could not delete this question.");
    setBusyId(null);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.metrics}>
        <article><span>Questions · 30 days</span><strong>{last30.length}</strong></article>
        <article><span>Verified answer rate</span><strong>{answeredRate}%</strong></article>
        <article><span>Open unanswered</span><strong>{unanswered.length}</strong></article>
        <article><span>Top theme</span><strong>{topCategories[0]?.[0] ?? "—"}</strong></article>
      </div>

      <div className={styles.insightGrid}>
        <section className={styles.insightCard}>
          <div className={styles.cardHead}><div><span className="eyebrow">Demand signals</span><h3>Most asked themes</h3></div><small>Last 30 days</small></div>
          {topCategories.length ? <div className={styles.barList}>{topCategories.map(([name, count]) => (
            <div key={name}><span>{name}</span><strong>{count}</strong></div>
          ))}</div> : <p className={styles.empty}>Questions will appear here as visitors use Ask URO.</p>}
        </section>

        <section className={styles.insightCard}>
          <div className={styles.cardHead}><div><span className="eyebrow">Repeated needs</span><h3>Frequently asked questions</h3></div><small>Anonymous</small></div>
          {topQuestions.length ? <div className={styles.questionList}>{topQuestions.map((item) => (
            <div key={normalise(item.label)}><p>{item.label}</p><span>{item.count} ask{item.count === 1 ? "" : "s"} · {item.grounded === item.count ? "answered" : "needs coverage"}</span></div>
          ))}</div> : <p className={styles.empty}>No question trends yet.</p>}
        </section>
      </div>

      <section className={styles.queue}>
        <div className={styles.cardHead}>
          <div><span className="eyebrow">Knowledge gap queue</span><h3>Questions Ask URO could not verify</h3></div>
          <Link href="#concierge-knowledge" className={styles.knowledgeLink}>Open knowledge manager</Link>
        </div>
        <p className={styles.queueIntro}>Review recurring gaps, add a sourced answer to the knowledge base when appropriate, then mark the question reviewed. Questions are stored without account IDs, IP addresses or browser identifiers, and obvious email/phone/long-number patterns are redacted before storage.</p>
        {message && <p className="form-message fallback">{message}</p>}
        {unanswered.length ? <div className={styles.queueList}>{unanswered.slice(0, 40).map((item) => (
          <article key={item.id}>
            <div className={styles.queueTop}><div><span>{item.category ?? "Unclassified"}</span><span>{item.page_path}</span></div><time>{shortDate(item.created_at)}</time></div>
            <h4>{item.question_redacted}</h4>
            <div className={styles.actions}>
              <button type="button" disabled={busyId === item.id} onClick={() => void setStatus(item, "reviewed")}>Mark reviewed</button>
              <button type="button" disabled={busyId === item.id} onClick={() => void setStatus(item, "dismissed")}>Dismiss</button>
              <Link href="#concierge-knowledge">Create verified answer</Link>
              <button className={styles.delete} type="button" disabled={busyId === item.id} onClick={() => void remove(item)}>Delete</button>
            </div>
          </article>
        ))}</div> : <p className={styles.empty}>No unanswered questions are waiting for review.</p>}
      </section>

      <p className={styles.privacyNote}>Privacy: analytics retain only the redacted question, page path and answer outcome. No visitor account, IP address, cookie identifier or device fingerprint is stored. Records older than 180 days are automatically pruned when new concierge questions arrive.</p>
    </div>
  );
}
