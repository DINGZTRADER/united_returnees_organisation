"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./AdminBriefingManager.module.css";

export type AdminBriefingItem = {
  id: string;
  kind: "news" | "opportunity";
  category: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  cta_label: string;
  published_at: string | null;
  verified_at: string;
  expires_at: string | null;
  priority: number;
  published: boolean;
  created_at: string;
};

type Draft = Omit<AdminBriefingItem, "id" | "verified_at" | "created_at">;

const EMPTY: Draft = {
  kind: "opportunity",
  category: "",
  title: "",
  summary: "",
  source_name: "",
  source_url: "",
  cta_label: "Read at source",
  published_at: null,
  expires_at: null,
  priority: 50,
  published: false,
};

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function isoOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? new Date(text).toISOString() : null;
}

export function AdminBriefingManager({ initialItems }: { initialItems: AdminBriefingItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const publishedCount = useMemo(() => items.filter((item) => item.published).length, [items]);

  function edit(item: AdminBriefingItem) {
    setEditingId(item.id);
    setDraft({
      kind: item.kind,
      category: item.category,
      title: item.title,
      summary: item.summary,
      source_name: item.source_name,
      source_url: item.source_url,
      cta_label: item.cta_label,
      published_at: item.published_at,
      expires_at: item.expires_at,
      priority: item.priority,
      published: item.published,
    });
    setMessage("");
  }

  function reset() {
    setEditingId(null);
    setDraft(EMPTY);
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      kind: String(form.get("kind")) as "news" | "opportunity",
      category: String(form.get("category") ?? "").trim(),
      title: String(form.get("title") ?? "").trim(),
      summary: String(form.get("summary") ?? "").trim(),
      source_name: String(form.get("source_name") ?? "").trim(),
      source_url: String(form.get("source_url") ?? "").trim(),
      cta_label: String(form.get("cta_label") ?? "Read at source").trim(),
      published_at: isoOrNull(form.get("published_at")),
      expires_at: isoOrNull(form.get("expires_at")),
      priority: Number(form.get("priority") ?? 0),
      published: form.get("published") === "on",
    };

    const response = await fetch("/api/admin/briefing", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error ?? "Could not save this item.");
      setBusy(false);
      return;
    }

    const item = body.item as AdminBriefingItem;
    setItems((current) => editingId
      ? current.map((existing) => existing.id === item.id ? item : existing)
      : [item, ...current]);
    setBusy(false);
    reset();
  }

  async function patch(item: AdminBriefingItem, changes: Partial<AdminBriefingItem>) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/briefing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, ...changes }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error ?? "Could not update this item.");
      setBusy(false);
      return;
    }
    const updated = body.item as AdminBriefingItem;
    setItems((current) => current.map((existing) => existing.id === updated.id ? updated : existing));
    setBusy(false);
  }

  async function remove(item: AdminBriefingItem) {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    setBusy(true);
    const response = await fetch("/api/admin/briefing", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    if (response.ok) setItems((current) => current.filter((existing) => existing.id !== item.id));
    else setMessage("Could not delete this item.");
    setBusy(false);
  }

  return (
    <div className={styles.manager}>
      <div className={styles.summary}>
        <div><strong>{items.length}</strong><span>Total items</span></div>
        <div><strong>{publishedCount}</strong><span>Published</span></div>
        <div><strong>{items.length - publishedCount}</strong><span>Drafts</span></div>
      </div>

      <form className={styles.form} onSubmit={save}>
        <div className={styles.formHead}>
          <div><span className="eyebrow">{editingId ? "Edit briefing" : "New briefing"}</span><h3>{editingId ? "Update item" : "Add news or opportunity"}</h3></div>
          {editingId && <button type="button" className={styles.textButton} onClick={reset}>Cancel edit</button>}
        </div>

        <div className={styles.grid}>
          <label>Type<select name="kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft["kind"] })}><option value="news">Uganda update</option><option value="opportunity">Opportunity</option></select></label>
          <label>Category<input name="category" required maxLength={80} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Jobs, Investment, Skills…" /></label>
          <label className={styles.full}>Headline<input name="title" required minLength={8} maxLength={220} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
          <label className={styles.full}>Why it matters<textarea name="summary" required minLength={20} maxLength={700} rows={4} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></label>
          <label>Source<input name="source_name" required maxLength={140} value={draft.source_name} onChange={(e) => setDraft({ ...draft, source_name: e.target.value })} /></label>
          <label>Source URL<input name="source_url" type="url" required value={draft.source_url} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} placeholder="https://…" /></label>
          <label>Button label<input name="cta_label" required maxLength={80} value={draft.cta_label} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} /></label>
          <label>Priority<input name="priority" type="number" min="-999" max="999" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} /></label>
          <label>Published date<input name="published_at" type="datetime-local" defaultValue={localDateTime(draft.published_at)} key={`pub-${editingId ?? "new"}-${draft.published_at ?? ""}`} /></label>
          <label>Expiry date<input name="expires_at" type="datetime-local" defaultValue={localDateTime(draft.expires_at)} key={`exp-${editingId ?? "new"}-${draft.expires_at ?? ""}`} /></label>
        </div>

        <div className={styles.formActions}>
          <label className={styles.check}><input name="published" type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> Publish on homepage</label>
          <button className="button" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add briefing item"}</button>
        </div>
        {message && <p className="form-message fallback">{message}</p>}
      </form>

      <div className={styles.list}>
        {items.map((item) => (
          <article className={styles.item} key={item.id}>
            <div className={styles.itemTop}>
              <div className={styles.badges}><span>{item.kind === "news" ? "Uganda update" : "Opportunity"}</span><span>{item.category}</span>{item.published ? <span className={styles.live}>Live</span> : <span>Draft</span>}</div>
              <strong className={styles.priority}>Priority {item.priority}</strong>
            </div>
            <h4>{item.title}</h4>
            <p>{item.summary}</p>
            <small>{item.source_name} · {item.expires_at ? `Expires ${new Date(item.expires_at).toLocaleDateString("en-GB")}` : "No expiry"}</small>
            <div className={styles.actions}>
              <button type="button" onClick={() => edit(item)} disabled={busy}>Edit</button>
              <button type="button" onClick={() => patch(item, { published: !item.published })} disabled={busy}>{item.published ? "Unpublish" : "Publish"}</button>
              <a href={item.source_url} target="_blank" rel="noreferrer">Open source ↗</a>
              <button type="button" className={styles.delete} onClick={() => remove(item)} disabled={busy}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
