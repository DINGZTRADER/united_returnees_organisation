"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import styles from "./UROConcierge.module.css";

type ConciergeLink = { label: string; href: string };
type PlannerContext = {
  active: boolean;
  timing: string | null;
  origin: string | null;
  household: string | null;
  priorities: string[];
};
type ChecklistItem = { title: string; detail: string; links: ConciergeLink[] };
type ConciergeReply = {
  answer: string;
  links: ConciergeLink[];
  grounded: boolean;
  confidence: "low" | "medium" | "high";
  category?: string;
  verifiedAt?: string;
  disclaimer?: string | null;
  sources?: Array<{ name: string; url: string; kind: "uro" | "official"; verifiedAt: string }>;
  replyType?: "answer" | "clarify" | "plan";
  prompts?: string[];
  checklist?: ChecklistItem[];
  planner?: PlannerContext;
};
type Message = {
  role: "user" | "assistant";
  content: string;
  reply?: ConciergeReply;
};

const QUICK = [
  "I am returning from the UK with two children and want to start a business",
  "Help me plan my return to Uganda",
  "How do I verify land before buying?",
  "Show me current opportunities",
] as const;

function formatVerified(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function SmartLink({ link, onNavigate }: { link: ConciergeLink; onNavigate?: () => void }) {
  return link.href.startsWith("http")
    ? <a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
    : <Link href={link.href} onClick={onNavigate}>{link.label}</Link>;
}

export function UROConcierge() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [planner, setPlanner] = useState<PlannerContext | undefined>();
  const [busy, setBusy] = useState(false);

  const contextualPrompt = useMemo(() => {
    if (pathname.startsWith("/join")) return "Questions about joining URO?";
    if (pathname.startsWith("/services")) return "Which kind of support do you need?";
    if (pathname.startsWith("/resources")) return "Looking for verified Uganda information?";
    if (pathname.startsWith("/login") || pathname.startsWith("/dashboard")) return "Need help with the member portal?";
    return "Plan your return with Ask URO";
  }, [pathname]);

  async function ask(value: string) {
    const clean = value.trim();
    if (!clean || busy) return;

    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    const userMessage: Message = { role: "user", content: clean };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setBusy(true);

    try {
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: clean, pagePath: pathname, history, plannerContext: planner }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not answer right now.");
      const reply = body as ConciergeReply;
      if (reply.planner) setPlanner(reply.planner);
      setMessages((current) => [...current, { role: "assistant", content: reply.answer, reply }]);
    } catch {
      const reply: ConciergeReply = {
        answer: "I could not reach the verified URO knowledge base just now. You can still use Returnee Support, Resources or contact URO directly.",
        links: [
          { label: "Returnee support", href: "/services" },
          { label: "Resources", href: "/resources" },
          { label: "Contact URO", href: "/contact" },
        ],
        grounded: false,
        confidence: "low",
        sources: [],
      };
      setMessages((current) => [...current, { role: "assistant", content: reply.answer, reply }]);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  function reset() {
    setMessages([]);
    setPlanner(undefined);
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
            {!messages.length && (
              <>
                <div className={styles.intro}>
                  <span className={styles.avatar}>U</span>
                  <p>Tell me your return situation in your own words. I can ask a few useful follow-up questions, build a practical checklist and keep every factual answer tied to URO-approved or official sources.</p>
                </div>
                <div className={styles.quick}>{QUICK.map((item) => <button type="button" key={item} onClick={() => void ask(item)}>{item}</button>)}</div>
              </>
            )}

            <div className={styles.conversation}>
              {messages.map((message, index) => message.role === "user" ? (
                <div className={styles.userMessage} key={`${index}-${message.content}`}><span>You</span><p>{message.content}</p></div>
              ) : (
                <div className={styles.reply} key={`${index}-${message.content}`}>
                  <div className={styles.replyStatus}>
                    <span className={message.reply?.grounded ? styles.verified : styles.guidance}>
                      {message.reply?.replyType === "plan" ? "Tailored return plan" : message.reply?.grounded ? "Verified knowledge" : "Planning guidance"}
                    </span>
                    {message.reply?.category && <span>{message.reply.category}</span>}
                  </div>
                  <p>{message.content}</p>

                  {message.reply?.checklist?.length ? (
                    <div className={styles.checklist}>
                      {message.reply.checklist.map((item, itemIndex) => (
                        <article key={`${item.title}-${itemIndex}`}>
                          <div className={styles.checkNumber}>{String(itemIndex + 1).padStart(2, "0")}</div>
                          <div>
                            <h4>{item.title}</h4>
                            <p>{item.detail}</p>
                            {item.links.length ? <div className={styles.itemLinks}>{item.links.map((link) => <SmartLink key={`${item.title}-${link.href}`} link={link} onNavigate={() => setOpen(false)} />)}</div> : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {message.reply?.disclaimer && <small className={styles.disclaimer}>{message.reply.disclaimer}</small>}

                  {!message.reply?.checklist?.length && message.reply?.links?.length ? (
                    <div className={styles.replyLinks}>
                      {message.reply.links.map((link) => <SmartLink key={`${link.label}-${link.href}`} link={link} onNavigate={() => setOpen(false)} />)}
                    </div>
                  ) : null}

                  {message.reply?.grounded && message.reply.sources?.length ? (
                    <div className={styles.sourceLine}>
                      <span>Verified sources · checked {formatVerified(message.reply.verifiedAt ?? message.reply.sources[0]?.verifiedAt)}</span>
                      <strong>{message.reply.sources.slice(0, 3).map((source) => source.name).join(" · ")}</strong>
                    </div>
                  ) : null}

                  {message.reply?.prompts?.length ? (
                    <div className={styles.followups}>
                      {message.reply.prompts.map((prompt) => <button type="button" key={prompt} disabled={busy} onClick={() => void ask(prompt)}>{prompt}</button>)}
                    </div>
                  ) : null}
                </div>
              ))}

              {busy && (
                <div className={styles.thinking}>
                  <span className={styles.avatar}>U</span>
                  <p>Checking verified URO information and your return context…</p>
                </div>
              )}
            </div>
          </div>

          <form className={styles.form} onSubmit={submit}>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Tell Ask URO what you need…" aria-label="Ask URO Concierge" disabled={busy} />
            <button type="submit" aria-label="Send question" disabled={busy}>→</button>
          </form>
          <div className={styles.panelFoot}>
            <small className={styles.note}>Verified guidance only. Confirm legal, tax, immigration, medical and investment decisions with the responsible institution or a qualified professional.</small>
            {messages.length ? <button type="button" className={styles.restart} onClick={reset}>Start a new conversation</button> : null}
          </div>
        </aside>
      )}

      <button className={styles.launcher} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open URO Concierge">
        <span className={styles.launcherMark}>U</span>
        <span><strong>Ask URO</strong><small>Returnee concierge</small></span>
      </button>
    </div>
  );
}
