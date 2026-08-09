"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import styles from "./UROConcierge.module.css";

type Reply = {
  text: string;
  links: Array<{ label: string; href: string }>;
};

const QUICK = [
  "I am planning to return",
  "I need work",
  "I want to start a business",
  "Show me opportunities",
] as const;

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9$ ]/g, " ");
}

function answer(question: string): Reply {
  const q = normalise(question);
  const has = (...words: string[]) => words.some((word) => q.includes(word));

  if (has("job", "work", "career", "employment", "cv")) {
    return {
      text: "For employment support, start with URO’s employment pathway. You can also check the Returnee Briefing for current jobs, training and skills opportunities.",
      links: [{ label: "Employment support", href: "/services#employment" }, { label: "Current opportunities", href: "/#returnee-briefing" }],
    };
  }
  if (has("business", "company", "entrepreneur", "startup", "start a business", "sme")) {
    return {
      text: "URO can guide you through business setup, compliance, market entry and support networks. The briefing also highlights financing and training opportunities.",
      links: [{ label: "Business support", href: "/services#business-entrepreneurship" }, { label: "Business opportunities", href: "/#returnee-briefing" }],
    };
  }
  if (has("invest", "investment", "property", "capital")) {
    return {
      text: "For investment, use URO’s investment pathway first so you can evaluate opportunities with better information and verified institutional links.",
      links: [{ label: "Investment support", href: "/services#investment" }, { label: "Investment opportunities", href: "/#returnee-briefing" }],
    };
  }
  if (has("return", "relocate", "move home", "coming home", "settle", "settlement")) {
    return {
      text: "If you are preparing to return, begin with settlement support and the Returnee Guide. They cover the practical decisions to make before committing time or money.",
      links: [{ label: "Settlement support", href: "/services#settlement-relocation" }, { label: "Returnee resources", href: "/resources" }, { label: "Join URO", href: "/join" }],
    };
  }
  if (has("opportun", "grant", "training", "finance", "loan", "news", "update")) {
    return {
      text: "The Returnee Briefing is the fastest place to see current Uganda updates and opportunities curated for returnees, with links back to the original sources.",
      links: [{ label: "Open Returnee Briefing", href: "/#returnee-briefing" }, { label: "Resources", href: "/resources" }],
    };
  }
  if (has("join", "member", "membership", "$100", "100", "fee")) {
    return {
      text: "URO membership is for Ugandans abroad planning to return and Ugandans already back home. The current annual membership fee shown on the site is USD 100.",
      links: [{ label: "Membership details", href: "/join" }, { label: "Member login", href: "/login" }],
    };
  }
  if (has("login", "account", "dashboard", "password", "sign in")) {
    return {
      text: "Use the Member Portal to sign in, view your application status, support requests and member information. Password recovery is available from the login page.",
      links: [{ label: "Member login", href: "/login" }, { label: "Dashboard", href: "/dashboard" }],
    };
  }
  if (has("legal", "government", "passport", "document", "tax", "ura", "nira")) {
    return {
      text: "For legal and government-service questions, use URO’s verified-information pathway rather than relying on informal advice.",
      links: [{ label: "Government & legal support", href: "/services#legal-government-services" }, { label: "Verified resources", href: "/resources" }],
    };
  }
  if (has("school", "education", "housing", "house", "bank", "health", "hospital", "telecom")) {
    return {
      text: "These are settlement questions. URO’s relocation pathway and resource centre are the best starting points for practical Uganda information.",
      links: [{ label: "Settlement & relocation", href: "/services#settlement-relocation" }, { label: "Resource centre", href: "/resources" }],
    };
  }
  if (has("help", "support", "contact", "whatsapp", "speak", "person")) {
    return {
      text: "If you need personal guidance, contact URO directly. You can start a support conversation through the contact page or WhatsApp.",
      links: [{ label: "Get support", href: "/contact" }, { label: "WhatsApp URO", href: "https://wa.me/256750038345" }],
    };
  }

  return {
    text: "I can guide you to the right part of URO for returning to Uganda, employment, business, investment, settlement, membership, current opportunities or direct support.",
    links: [{ label: "Returnee support", href: "/services" }, { label: "Current opportunities", href: "/#returnee-briefing" }, { label: "Contact URO", href: "/contact" }],
  };
}

export function UROConcierge() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);

  const contextualPrompt = useMemo(() => {
    if (pathname.startsWith("/join")) return "Questions about joining URO?";
    if (pathname.startsWith("/services")) return "Which kind of support do you need?";
    if (pathname.startsWith("/resources")) return "Looking for Uganda information?";
    if (pathname.startsWith("/login") || pathname.startsWith("/dashboard")) return "Need help with the member portal?";
    return "Planning your return to Uganda?";
  }, [pathname]);

  function ask(value: string) {
    const clean = value.trim();
    if (!clean) return;
    setQuestion(clean);
    setReply(answer(clean));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <div className={styles.wrap}>
      {open && (
        <aside className={styles.panel} aria-label="URO website concierge">
          <div className={styles.head}>
            <div><span>URO Concierge</span><strong>{contextualPrompt}</strong></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close URO Concierge">×</button>
          </div>

          <div className={styles.body}>
            <div className={styles.intro}>
              <span className={styles.avatar}>U</span>
              <p>I’ll help you find the right URO service, resource or opportunity without making you search through the whole website.</p>
            </div>

            {!reply && <div className={styles.quick}>{QUICK.map((item) => <button type="button" key={item} onClick={() => ask(item)}>{item}</button>)}</div>}

            {reply && (
              <div className={styles.reply}>
                <p>{reply.text}</p>
                <div>{reply.links.map((link) => link.href.startsWith("http") ? <a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label}</a> : <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}</div>
                <button type="button" className={styles.askAnother} onClick={() => { setReply(null); setQuestion(""); }}>Ask something else</button>
              </div>
            )}
          </div>

          <form className={styles.form} onSubmit={submit}>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about returning, work, business…" aria-label="Ask URO Concierge" />
            <button type="submit" aria-label="Send question">→</button>
          </form>
          <small className={styles.note}>Navigation guidance only. Verify official requirements and opportunity terms at their source.</small>
        </aside>
      )}

      <button className={styles.launcher} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open URO Concierge">
        <span className={styles.launcherMark}>U</span>
        <span><strong>Ask URO</strong><small>Smart concierge</small></span>
      </button>
    </div>
  );
}
