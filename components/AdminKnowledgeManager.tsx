"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./AdminBriefingManager.module.css";

export type AdminKnowledgeArticle = {
  id: string;
  slug: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  source_name: string;
  source_url: string;
  source_kind: "uro" | "official";
  priority: number;
  published: boolean;
  verified_at: string;
  review_after: string | null;
  created_at: string;
};

type Draft = Omit<AdminKnowledgeArticle, "id" | "verified_at" | "created_at">;

const EMPTY: Draft = {
  slug: "",
  category: "",
  question: "",
  answer: "",
  keywords: [],
  source_name: "",
  source_url: "",
  source_kind: "official",
  priority: 50,
  published: false,
  review_after: null,
};

function date(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "No review date";
}

export function AdminKnowledgeManager({ initialItems }: { initialItems: AdminKnowledgeArticle[] }) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [keywordsText, setKeywordsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const publishedCount = useMemo(() => items.filter((item) => item.published).length, [items]);
  const reviewDue = useMemo(() => items.filter((item) => item.review_after && item.review_after < new Date().toISOString().slice(0, 10)).length, [items]);

  function edit(item: AdminKnowledgeArticle) {
    setEditingId(item.id);
    setDraft({
      slug: item.slug,
      category: item.category,
      question: item.question,
      answer: item.answer,
      keywords: item.keywords,
      source_name: item.source_name,
      source_url: item.source_url,
      source_kind: item.source_kind,
      priority: item.priority,
      published: item.published,
      review_after: item.review_after,
    });
    setKeywordsText(item.keywords.join(", "));
    setMessage("");
  }

  function reset() {
    setEditingId(null);
    setDraft(EMPTY);
    setKeywordsText("");
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      slug: String(form.get("slug") ?? "").trim().toLowerCase(),
      category: String(form.get("category") ?? "").trim(),
      question: String(form.get("question") ?? "").trim(),
      answer: String(form.get("answer") ?? "").trim(),
      keywords: String(form.get("keywords") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
      source_name: String(form.get("source_name") ?? "").trim(),
      source_url: String(form.get("source_url") ?? "").trim(),
      source_kind: String(form.get("source_kind") ?? "official") as "uro" | "official",
      priority: Number(form.get("priority") ?? 0),
      review_after: String(form.get("review_after") ?? "").trim() || null,
      published: form.get("published") === "on",
    };

    const response = await fetch("/api/admin/knowledge", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error ?? "Could not save this knowledge article.");
      setBusy(false);
      return;
    }

    const item = body.item as AdminKnowledgeArticle;
    setItems((current) => editingId
      ? current.map((existing) => existing.id === item.id ? item : existing)
      : [item, ...current]);
    setBusy(false);
    reset();
  }

  async function patch(item: AdminKnowledgeArticle, changes: Partial<AdminKnowledgeArticle>) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/knowledge", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, ...changes }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error ?? "Could not update this article.");
      setBusy(false);
      return;
    }
    const updated = body.item as AdminKnowledgeArticle;
    setItems((current) => current.map((existing) => existing.id === updated.id ? updated : existing));
    setBusy(false);
  }

  async function remove(item: AdminKnowledgeArticle) {
    if (!window.confirm(`Delete “${item.question}”?`)) return;
    setBusy(true);
    const response = await fetch("/api/admin/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    if (response.ok) setItems((current) => current.filter((existing) => existing.id !== item.id));
    else setMessage("Could not delete this article.");
    setBusy(false);
  }

  return (
    <div className={styles.manager}>
      <div className={styles.summary}>
        <div><strong>{items.length}</strong><span>Knowledge articles</span></div>
        <div><strong>{publishedCount}</strong><span>Available to concierge</span></div>
        <div><strong>{reviewDue}</strong><span>Review overdue</span></div>
      </div>

      <form className={styles.form} onSubmit={save}>
        <div className={styles.formHead}>
          <div><span className="eyebrow">{editingId ? "Edit knowledge" : "New knowledge"}</span><h3>{editingId ? "Re-verify article" : "Add verified answer"}</h3></div>
          {editingId && <button type="button" className={styles.textButton} onClick={reset}>Cancel edit</button>}
        </div>

        <div className={styles.grid}>
          <label>Slug<input name="slug" required pattern="[a-z0-9-]+" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="business-registration" /></label>
          <label>Category<input name="category" required maxLength={80} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Business, Documents, Settlement…" /></label>
          <label className={styles.full}>Visitor question<input name="question" required minLength={8} maxLength={240} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} /></label>
          <label className={styles.full}>Approved answer<textarea name="answer" required minLength={30} maxLength={1600} rows={5} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} /></label>
          <label className={styles.full}>Keywords<input name="keywords" value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} placeholder="passport, immigration, documents" /></label>
          <label>Source type<select name="source_kind" value={draft.source_kind} onChange={(e) => setDraft({ ...draft, source_kind: e.target.value as Draft["source_kind"] })}><option value="official">Official institution</option><option value="uro">URO-approved</option></select></label>
          <label>Source name<input name="source_name" required maxLength={140} value={draft.source_name} onChange={(e) => setDraft({ ...draft, source_name: e.target.value })} /></label>
          <label className={styles.full}>Source URL or URO path<input name="source_url" required value={draft.source_url} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} placeholder="https://official.go.ug/… or /resources" /></label>
          <label>Review again after<input name="review_after" type="date" value={draft.review_after ?? ""} onChange={(e) => setDraft({ ...draft, review_after: e.target.value || null })} /></label>
          <label>Priority<input name="priority" type="number" min="-999" max="999" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} /></label>
        </div>

        <div className={styles.formActions}>
          <label className={styles.check}><input name="published" type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> Make available to Ask URO</label>
          <button className="button" disabled={busy}>{busy ? "Saving…" : editingId ? "Save & re-verify" : "Add knowledge article"}</button>
        </div>
        {message && <p className="form-message fallback">{message}</p>}
      </form>

      <div className={styles.list}>
        {items.map((item) => (
          <article className={styles.item} key={item.id}>
            <div className={styles.itemTop}>
              <div className={styles.badges}><span>{item.source_kind === "official" ? "Official source" : "URO approved"}</span><span>{item.category}</span>{item.published ? <span className={styles.live}>Live</span> : <span>Draft</span>}</div>
              <strong className={styles.priority}>Priority {item.priority}</strong>
            </div>
            <h4>{item.question}</h4>
            <p>{item.answer}</p>
            <small>{item.source_name} · Review: {date(item.review_after)}</small>
            <div className={styles.actions}>
              <button type="button" onClick={() => edit(item)} disabled={busy}>Edit / verify</button>
              <button type="button" onClick={() => patch(item, { published: !item.published })} disabled={busy}>{item.published ? "Remove from concierge" : "Publish to concierge"}</button>
              {item.source_url.startsWith("http") && <a href={item.source_url} target="_blank" rel="noreferrer">Open source ↗</a>}
              <button type="button" className={styles.delete} onClick={() => remove(item)} disabled={busy}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
