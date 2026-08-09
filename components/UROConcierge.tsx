"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import styles from "./UROConcierge.module.css";

type ConciergeLink = { label: string; href: string };
type ConciergeReply = {
  answer: string;
  links: ConciergeLink[];
  grounded: boolean;
  confidence: "low" | "medium" | "high";
  category?: string;
  verifiedAt?: string;
  disclaimer?: string | null;
  sources?: Array<{ name: string; url: string; kind: "uro" | "official"; verifiedAt: string }>;
};

const QUICK = [
  "I am planning to return",
  "How do I register a business?",
  "How do I verify land before buying?",
  "Show me opportunities",
] as const;

function formatVerified(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function UROConcierge() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [reply, setReply] = useState<ConciergeReply | null>(null);
  const [busy, setBusy] = useState(false);

  const contextualPrompt = useMemo(() => {
    if (pathname.startsWith("/join")) return "Questions about joining URO?";
    if (pathname.startsWith("/services")) return "Which kind of support do you need?";
    if (pathname.startsWith("/resources")) return "Looking for verified Uganda information?";
    if (pathname.startsWith("/login") || pathname.startsWith("/dashboard")) return "Need help with the member portal?";
    return "Planning your return to Uganda?";
  }, [pathname]);

  async function ask(value: string) {
    const clean = value.trim();
    if (!clean || busy) return;
    setAskedQuestion(clean);
    setQuestion(clean);
    setReply(null);
    setBusy(true);

    try {
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: clean }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not answer right now.");
      setReply(body as ConciergeReply);
    } catch {
      setReply({
        answer: "I could not reach the verified URO knowledge base just now. You can still use Returnee Support, Resources or contact URO directly.",
        links: [
          { label: "Returnee support", href: "/services" },
          { label: "Resources", href: "/resources" },
          { label: "Contact URO", href: "/contact" },
        ],
        grounded: false,
        confidence: "low",
        sources: [],
      });
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  function reset() {
    setReply(null);
    setAskedQuestion("");
    setQuestion("");
  }

  return (
    <div className={styles.wrap}>
      {open && (
        <aside className={styles.panel} aria-label="URO intelligent concierge">
          <div className={styles.head}>
            <div><span>URO Concierge</span><strong>{contextualPrompt}</strong></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close URO Concierge">×</button>
          </div>

          <div className={styles.body} aria-live="polite">
            {!askedQuestion && (
              <>
                <div className={styles.intro}>
                  <span className={styles.avatar}>U</span>
                  <p>Ask me about returning, membership, business, investment, documents, land or current opportunities. I use URO’s verified knowledge base and link you to the source.</p>
                </div>
                <div className={styles.quick}>{QUICK.map((item) => <button type="button" key={item} onClick={() => void ask(item)}>{item}</button>)}</div>
              </>
            )}

            {askedQuestion && <div className={styles.userMessage}><span>You</span><p>{askedQuestion}</p></div>}

            {busy && (
              <div className={styles.thinking}>
                <span className={styles.avatar}>U</span>
                <p>Checking verified URO information…</p>
              </div>
            )}

            {reply && (
              <div className={styles.reply}>
                <div className={styles.replyStatus}>
                  <span className={reply.grounded ? styles.verified : styles.guidance}>{reply.grounded ? "Verified knowledge" : "Navigation guidance"}</span>
                  {reply.category && <span>{reply.category}</span>}
                </div>
                <p>{reply.answer}</p>
                {reply.disclaimer && <small className={styles.disclaimer}>{reply.disclaimer}</small>}
                <div className={styles.replyLinks}>
                  {reply.links.map((link) => link.href.startsWith("http")
                    ? <a key={`${link.label}-${link.href}`} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
                    : <Link key={`${link.label}-${link.href}`} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
                </div>
                {reply.grounded && reply.sources?.length ? (
                  <div className={styles.sourceLine}>
                    <span>Source checked {formatVerified(reply.verifiedAt ?? reply.sources[0]?.verifiedAt)}</span>
                    <strong>{reply.sources[0]?.name}</strong>
                  </div>
                ) : null}
                <button type="button" className={styles.askAnother} onClick={reset}>Ask another question</button>
              </div>
            )}
          </div>

          <form className={styles.form} onSubmit={submit}>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask URO a question…" aria-label="Ask URO Concierge" disabled={busy} />
            <button type="submit" aria-label="Send question" disabled={busy}>→</button>
          </form>
          <small className={styles.note}>Answers are limited to URO-approved or official sources. For personal legal, tax, immigration, medical or investment decisions, confirm with the responsible institution or a qualified professional.</small>
        </aside>
      )}

      <button className={styles.launcher} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open URO Concierge">
        <span className={styles.launcherMark}>U</span>
        <span><strong>Ask URO</strong><small>Verified concierge</small></span>
      </button>
    </div>
  );
}
