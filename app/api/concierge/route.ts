import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AskSchema = z.object({ question: z.string().trim().min(2).max(500) });

type RouteLink = { label: string; href: string };
type KnowledgeArticle = {
  id: string;
  slug: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  source_name: string;
  source_url: string;
  source_kind: "uro" | "official";
  route_links: RouteLink[];
  priority: number;
  verified_at: string;
  review_after: string | null;
};

const STOPWORDS = new Set([
  "a", "an", "and", "are", "can", "do", "for", "from", "how", "i", "in", "is", "it", "me", "my",
  "of", "on", "or", "the", "to", "what", "where", "with", "you", "your", "about", "need", "want",
]);

const INTENTS = [
  ["job", "jobs", "work", "career", "employment", "cv", "vacancy"],
  ["business", "company", "startup", "entrepreneur", "sme", "register", "registration", "ursb"],
  ["tax", "tin", "ura", "taxpayer", "revenue"],
  ["passport", "immigration", "citizenship", "dual", "reacquire", "former ugandan"],
  ["national id", "nin", "nira", "identity", "id card"],
  ["investment", "invest", "investor", "uia", "capital"],
  ["land", "property", "title", "plot", "house", "buy land"],
  ["return", "returning", "relocate", "settlement", "coming home", "move home"],
  ["member", "membership", "join", "fee", "100"],
  ["opportunity", "opportunities", "grant", "training", "loan", "finance", "news", "update"],
  ["contact", "support", "help", "whatsapp", "person", "human", "advisor"],
] as const;

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9$ ]/g, " ").replace(/\s+/g, " ").trim();
}

function termsFor(question: string) {
  const q = normalise(question);
  const base = q.split(" ").filter((term) => term.length > 1 && !STOPWORDS.has(term));
  const expanded = new Set(base);
  for (const group of INTENTS) {
    if (group.some((term) => q.includes(term))) group.forEach((term) => expanded.add(term));
  }
  return { q, terms: [...expanded] };
}

function scoreArticle(article: KnowledgeArticle, question: string) {
  const { q, terms } = termsFor(question);
  const category = normalise(article.category);
  const prompt = normalise(article.question);
  const answer = normalise(article.answer);
  const source = normalise(article.source_name);
  const keywords = article.keywords.map(normalise);
  let score = Math.max(0, article.priority) / 1000;

  if (prompt.includes(q) || q.includes(prompt)) score += 10;

  for (const term of terms) {
    if (keywords.some((keyword) => keyword === term || keyword.includes(term) || term.includes(keyword))) score += 6;
    if (prompt.includes(term)) score += 4;
    if (category.includes(term)) score += 3;
    if (answer.includes(term)) score += 1;
    if (source.includes(term)) score += 1;
  }
  return score;
}

function isFresh(article: KnowledgeArticle) {
  if (!article.review_after) return true;
  return article.review_after >= new Date().toISOString().slice(0, 10);
}

function fallback(question: string) {
  const q = normalise(question);
  const has = (...words: string[]) => words.some((word) => q.includes(word));

  if (has("job", "work", "career", "employment", "cv")) return {
    answer: "I do not yet have a verified article that answers that exact employment question. I can take you to URO employment support and the current Returnee Briefing instead.",
    links: [{ label: "Employment support", href: "/services#employment" }, { label: "Current opportunities", href: "/#returnee-briefing" }],
  };
  if (has("business", "company", "startup", "entrepreneur")) return {
    answer: "I do not have enough verified information to answer that exact business question yet. Start with URO business support and use official registration sources before committing money.",
    links: [{ label: "Business support", href: "/services#business-entrepreneurship" }, { label: "Returnee Briefing", href: "/#returnee-briefing" }],
  };
  if (has("return", "relocate", "settle", "coming home")) return {
    answer: "I can help you plan the return, but I do not have a verified answer for that exact question yet. Start with settlement support and the Returnee Guide, or contact URO for personal guidance.",
    links: [{ label: "Settlement support", href: "/services#settlement-relocation" }, { label: "Returnee resources", href: "/resources" }, { label: "Contact URO", href: "/contact" }],
  };
  return {
    answer: "I do not have a verified URO knowledge-base answer for that exact question yet. I can still guide you to the most relevant support area, or you can ask URO directly for personal guidance.",
    links: [{ label: "Returnee support", href: "/services" }, { label: "Returnee resources", href: "/resources" }, { label: "Contact URO", href: "/contact" }],
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = AskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please enter a short question." }, { status: 422 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("id,slug,category,question,answer,keywords,source_name,source_url,source_kind,route_links,priority,verified_at,review_after")
    .eq("published", true)
    .order("priority", { ascending: false })
    .limit(100);

  if (error || !data) {
    const safe = fallback(parsed.data.question);
    return NextResponse.json({ ...safe, grounded: false, sources: [], confidence: "low" });
  }

  const ranked = (data as KnowledgeArticle[])
    .filter(isFresh)
    .map((article) => ({ article, score: scoreArticle(article, parsed.data.question) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 4) {
    const safe = fallback(parsed.data.question);
    return NextResponse.json({ ...safe, grounded: false, sources: [], confidence: "low" });
  }

  const article = best.article;
  const links = Array.isArray(article.route_links) ? article.route_links.slice(0, 4) : [];
  const sourceLink = { label: article.source_kind === "official" ? `Official source: ${article.source_name}` : `Source: ${article.source_name}`, href: article.source_url };
  if (!links.some((link) => link.href === sourceLink.href)) links.push(sourceLink);

  const highStake = ["Tax & compliance", "Documents", "Citizenship", "Investment", "Property & land"].includes(article.category);

  return NextResponse.json({
    answer: article.answer,
    grounded: true,
    confidence: best.score >= 16 ? "high" : "medium",
    category: article.category,
    verifiedAt: article.verified_at,
    disclaimer: highStake ? "Requirements, fees and eligibility can change. Confirm the current position at the official source before acting." : null,
    sources: [{ name: article.source_name, url: article.source_url, kind: article.source_kind, verifiedAt: article.verified_at }],
    links,
  });
}
