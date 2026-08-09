import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const PlannerContextSchema = z.object({
  active: z.boolean().optional(),
  timing: z.string().trim().max(80).nullable().optional(),
  origin: z.string().trim().max(80).nullable().optional(),
  household: z.string().trim().max(120).nullable().optional(),
  priorities: z.array(z.string().trim().max(80)).max(8).optional(),
}).optional();

const AskSchema = z.object({
  question: z.string().trim().min(2).max(500),
  pagePath: z.string().trim().max(160).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(900),
  })).max(10).optional(),
  plannerContext: PlannerContextSchema,
});

type RouteLink = { label: string; href: string };
type PlannerContext = {
  active: boolean;
  timing: string | null;
  origin: string | null;
  household: string | null;
  priorities: string[];
};
type ChecklistItem = { title: string; detail: string; links: RouteLink[] };
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
type ConciergeOutcome = {
  answer: string;
  links: RouteLink[];
  grounded: boolean;
  confidence: "low" | "medium" | "high";
  category?: string;
  verifiedAt?: string;
  disclaimer?: string | null;
  sources: Array<{ name: string; url: string; kind: "uro" | "official"; verifiedAt: string }>;
  replyType?: "answer" | "clarify" | "plan";
  prompts?: string[];
  checklist?: ChecklistItem[];
  planner?: PlannerContext;
};

const STOPWORDS = new Set([
  "a", "an", "and", "are", "can", "do", "for", "from", "how", "i", "in", "is", "it", "me", "my",
  "of", "on", "or", "the", "to", "what", "where", "with", "you", "your", "about", "need", "want",
]);

const INTENTS = [
  ["job", "jobs", "work", "career", "employment", "cv", "vacancy"],
  ["business", "company", "startup", "entrepreneur", "sme", "register", "registration", "restaurant", "ursb"],
  ["tax", "tin", "ura", "taxpayer", "revenue"],
  ["passport", "immigration", "citizenship", "dual", "reacquire", "former ugandan"],
  ["national id", "nin", "nira", "identity", "id card"],
  ["investment", "invest", "investor", "uia", "capital"],
  ["land", "property", "title", "plot", "house", "buy land"],
  ["return", "returning", "relocate", "settlement", "coming home", "move home", "return plan"],
  ["member", "membership", "join", "fee", "100"],
  ["opportunity", "opportunities", "grant", "training", "loan", "finance", "news", "update"],
  ["contact", "support", "help", "whatsapp", "person", "human", "advisor"],
] as const;

const COUNTRY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(?:uk|united kingdom|england|scotland|wales)\b/i, "United Kingdom"],
  [/\b(?:usa|u\.s\.a\.|united states|america)\b/i, "United States"],
  [/\bcanada\b/i, "Canada"],
  [/\b(?:uae|united arab emirates|dubai|abu dhabi)\b/i, "United Arab Emirates"],
  [/\bsaudi arabia\b/i, "Saudi Arabia"],
  [/\bqatar\b/i, "Qatar"],
  [/\bgermany\b/i, "Germany"],
  [/\bfrance\b/i, "France"],
  [/\bnetherlands\b/i, "Netherlands"],
  [/\bsweden\b/i, "Sweden"],
  [/\bnorway\b/i, "Norway"],
  [/\bdenmark\b/i, "Denmark"],
  [/\baustralia\b/i, "Australia"],
  [/\bnew zealand\b/i, "New Zealand"],
  [/\bsouth africa\b/i, "South Africa"],
  [/\bkenya\b/i, "Kenya"],
];

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9$ ]/g, " ").replace(/\s+/g, " ").trim();
}

function redactForAnalytics(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone removed]")
    .replace(/\b(?:\d[ -]*?){12,19}\b/g, "[number removed]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function safePagePath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value.slice(0, 160);
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

function inferPlannerContext(text: string, prior?: z.infer<typeof PlannerContextSchema>): PlannerContext {
  const current: PlannerContext = {
    active: prior?.active ?? false,
    timing: prior?.timing ?? null,
    origin: prior?.origin ?? null,
    household: prior?.household ?? null,
    priorities: prior?.priorities ?? [],
  };
  const q = normalise(text);

  if (["return", "returning", "relocate", "coming home", "move home", "return plan", "back to uganda"].some((term) => q.includes(term))) current.active = true;

  for (const [pattern, label] of COUNTRY_PATTERNS) {
    if (pattern.test(text)) { current.origin = label; break; }
  }

  const childMatch = text.match(/\b(\d+|one|two|three|four|five)\s+(?:children|kids|child)\b/i);
  const numberWords: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5" };
  if (childMatch) {
    const raw = childMatch[1].toLowerCase();
    const count = numberWords[raw] ?? raw;
    const withPartner = /\b(spouse|wife|husband|partner)\b/i.test(text);
    current.household = `${withPartner ? "Partner and " : ""}${count} ${count === "1" ? "child" : "children"}`;
  } else if (/\b(with my family|family of|my family)\b/i.test(text) && !current.household) {
    current.household = "Family";
  } else if (/\b(spouse|wife|husband|partner)\b/i.test(text) && !current.household) {
    current.household = "Partner/spouse";
  }

  if (/\b(already back|already returned|already in uganda|back in uganda now)\b/i.test(text)) current.timing = "Already back in Uganda";
  else if (/\b(within|next)\s+(?:1|2|3|one|two|three)\s+months?\b/i.test(text) || /\bnext month\b|\bvery soon\b|\bwithin 3 months\b/i.test(text)) current.timing = "Within 3 months";
  else if (/\b3\s*[-–]\s*12\s+months?\b/i.test(text) || /\b(?:4|5|6|7|8|9|10|11|12)\s+months?\b/i.test(text) || /\blater this year\b/i.test(text)) current.timing = "3–12 months";
  else if (/\bmore than (?:a|one|1) year\b|\bnext year\b|\bover a year\b/i.test(text)) current.timing = "More than a year";
  else if (/^within 3 months$/i.test(text.trim())) current.timing = "Within 3 months";
  else if (/^3[–-]12 months$/i.test(text.trim())) current.timing = "3–12 months";
  else if (/^more than a year$/i.test(text.trim())) current.timing = "More than a year";
  else if (/^already back in uganda$/i.test(text.trim())) current.timing = "Already back in Uganda";

  const priorityRules: Array<[string, RegExp]> = [
    ["Business", /\b(business|company|startup|entrepreneur|restaurant|shop|enterprise)\b/i],
    ["Employment", /\b(job|jobs|work|career|employment|cv|vacancy)\b/i],
    ["Investment", /\b(invest|investment|investor|capital)\b/i],
    ["Property", /\b(land|property|plot|house|home purchase)\b/i],
    ["Documents", /\b(passport|citizenship|nin|national id|documents|immigration)\b/i],
    ["Schooling", /\b(school|schools|schooling|education for my children|education for the children)\b/i],
  ];
  const nextPriorities = new Set(current.priorities);
  for (const [label, pattern] of priorityRules) if (pattern.test(text)) nextPriorities.add(label);

  const exactPriority: Record<string, string> = {
    "find work": "Employment",
    "start or grow a business": "Business",
    "invest in uganda": "Investment",
    "settle my family": "Settlement",
    "sort documents": "Documents",
  };
  const exact = exactPriority[text.trim().toLowerCase()];
  if (exact) nextPriorities.add(exact);
  current.priorities = [...nextPriorities];
  return current;
}

function plannerSummary(planner: PlannerContext) {
  const parts: string[] = [];
  if (planner.origin) parts.push(`returning from ${planner.origin}`);
  if (planner.household) parts.push(`with ${planner.household.toLowerCase()}`);
  if (planner.priorities.length) parts.push(`focused on ${planner.priorities.join(", ").toLowerCase()}`);
  return parts.length ? `I understand you are ${parts.join(" and ")}.` : "I can build a tailored return plan around your situation.";
}

function fallback(question: string): ConciergeOutcome {
  const q = normalise(question);
  const has = (...words: string[]) => words.some((word) => q.includes(word));

  if (has("job", "work", "career", "employment", "cv")) return {
    answer: "I do not yet have a verified article that answers that exact employment question. I can take you to URO employment support and the current Returnee Briefing instead.",
    links: [{ label: "Employment support", href: "/services#employment" }, { label: "Current opportunities", href: "/#returnee-briefing" }],
    grounded: false, confidence: "low", sources: [], category: "Employment", replyType: "answer",
  };
  if (has("business", "company", "startup", "entrepreneur")) return {
    answer: "I do not have enough verified information to answer that exact business question yet. Start with URO business support and use official registration sources before committing money.",
    links: [{ label: "Business support", href: "/services#business-entrepreneurship" }, { label: "Returnee Briefing", href: "/#returnee-briefing" }],
    grounded: false, confidence: "low", sources: [], category: "Business", replyType: "answer",
  };
  if (has("return", "relocate", "settle", "coming home")) return {
    answer: "I can help you plan the return, but I do not have a verified answer for that exact question yet. Start with settlement support and the Returnee Guide, or contact URO for personal guidance.",
    links: [{ label: "Settlement support", href: "/services#settlement-relocation" }, { label: "Returnee resources", href: "/resources" }, { label: "Contact URO", href: "/contact" }],
    grounded: false, confidence: "low", sources: [], category: "Settlement", replyType: "answer",
  };
  return {
    answer: "I do not have a verified URO knowledge-base answer for that exact question yet. I can still guide you to the most relevant support area, or you can ask URO directly for personal guidance.",
    links: [{ label: "Returnee support", href: "/services" }, { label: "Returnee resources", href: "/resources" }, { label: "Contact URO", href: "/contact" }],
    grounded: false, confidence: "low", sources: [], replyType: "answer",
  };
}

function sourceFor(article: KnowledgeArticle) {
  return { name: article.source_name, url: article.source_url, kind: article.source_kind, verifiedAt: article.verified_at } as const;
}

function articleLinks(article?: KnowledgeArticle) {
  if (!article) return [] as RouteLink[];
  const links = Array.isArray(article.route_links) ? article.route_links.slice(0, 2) : [];
  const sourceLink = { label: article.source_kind === "official" ? `Official source: ${article.source_name}` : `Source: ${article.source_name}`, href: article.source_url };
  if (!links.some((link) => link.href === sourceLink.href)) links.push(sourceLink);
  return links;
}

function makePlan(planner: PlannerContext, articles: KnowledgeArticle[]): ConciergeOutcome {
  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  const used: KnowledgeArticle[] = [];
  const checklist: ChecklistItem[] = [];
  const addArticle = (slug: string, title: string, detail?: string) => {
    const article = bySlug.get(slug);
    if (!article) return;
    used.push(article);
    checklist.push({ title, detail: detail ?? article.answer, links: articleLinks(article) });
  };

  addArticle("return-planning", planner.timing === "Already back in Uganda" ? "Rebuild from where you are now" : "Lock down the return plan");

  if (planner.household) {
    checklist.push({
      title: "Plan the household move early",
      detail: "Use URO settlement support to work through housing, schools, banking, telecommunications and other practical return needs. School-specific requirements are not yet covered in the verified concierge knowledge base, so confirm them directly with the relevant school or authority.",
      links: [{ label: "Settlement support", href: "/services#settlement-relocation" }, { label: "Returnee resources", href: "/resources" }],
    });
  }

  if (planner.priorities.includes("Business")) {
    addArticle("business-registration", "Set up the business through official channels");
    addArticle("taxpayer-tin", "Check tax registration before trading");
  }
  if (planner.priorities.includes("Employment")) {
    checklist.push({
      title: "Build an employment landing plan",
      detail: "Use URO employment support for CV readiness, professional networking and suitable opportunity pathways, then monitor the Returnee Briefing for current openings and programmes.",
      links: [{ label: "Employment support", href: "/services#employment" }, { label: "Current opportunities", href: "/#returnee-briefing" }],
    });
  }
  if (planner.priorities.includes("Investment")) addArticle("diaspora-investment", "Verify investment support before committing capital");
  if (planner.priorities.includes("Property")) addArticle("land-title-check", "Verify property before paying or signing");
  if (planner.priorities.includes("Documents")) {
    addArticle("ordinary-passport", "Check passport requirements");
    addArticle("national-id", "Check National ID / NIN requirements");
  }
  if (planner.priorities.includes("Schooling") && !planner.household) {
    checklist.push({
      title: "Confirm education arrangements early",
      detail: "Use settlement support to structure the school search. Ask URO does not yet hold verified school-specific admissions guidance, so confirm requirements and fees directly with each school.",
      links: [{ label: "Settlement support", href: "/services#settlement-relocation" }, { label: "Contact URO", href: "/contact" }],
    });
  }

  addArticle("current-opportunities", "Keep a live opportunity watch");
  addArticle("personal-support", "Escalate decisions that need a human");

  const uniqueUsed = used.filter((article, index, list) => list.findIndex((item) => item.id === article.id) === index);
  const links = checklist.flatMap((item) => item.links).filter((link, index, list) => list.findIndex((item) => item.href === link.href) === index).slice(0, 6);
  const verifiedAt = uniqueUsed.map((article) => article.verified_at).sort().at(0);
  const timingText = planner.timing ? ` With your timing set to ${planner.timing.toLowerCase()},` : "";
  const focusText = planner.priorities.length ? ` I have prioritised ${planner.priorities.join(", ").toLowerCase()}.` : "";

  return {
    answer: `${plannerSummary(planner)}${timingText} here is a practical first-pass return checklist built only from URO-approved guidance and verified institutional sources.${focusText}`,
    links,
    grounded: uniqueUsed.length > 0,
    confidence: "high",
    category: "Tailored return plan",
    verifiedAt,
    disclaimer: "This is a planning guide, not a legal, tax, immigration, medical or investment decision. Confirm changeable requirements, fees and eligibility at the linked official source before acting.",
    sources: uniqueUsed.slice(0, 5).map(sourceFor),
    replyType: "plan",
    checklist,
    planner,
    prompts: ["What should I do first?", "What about documents?", "Show me current opportunities"],
  };
}

function looksLikePlannerSelection(question: string) {
  const value = question.trim().toLowerCase();
  return [
    "within 3 months", "3–12 months", "3-12 months", "more than a year", "already back in uganda",
    "find work", "start or grow a business", "invest in uganda", "settle my family", "sort documents",
  ].includes(value);
}

async function recordQuestion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  question: string,
  pagePath: string,
  outcome: ConciergeOutcome,
  matchedArticleId: string | null,
  skip = false,
) {
  if (skip) return;
  const redacted = redactForAnalytics(question);
  if (redacted.length < 2) return;
  await supabase.from("concierge_questions").insert({
    question_redacted: redacted,
    page_path: pagePath,
    grounded: outcome.grounded,
    confidence: outcome.confidence,
    category: outcome.category ?? null,
    matched_article_id: matchedArticleId,
    review_status: "open",
    reviewed_at: null,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = AskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please enter a short question." }, { status: 422 });

  const question = parsed.data.question;
  const pagePath = safePagePath(parsed.data.pagePath);
  const historyText = (parsed.data.history ?? []).map((item) => item.content).join(" ");
  const planner = inferPlannerContext(`${historyText} ${question}`, parsed.data.plannerContext);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("id,slug,category,question,answer,keywords,source_name,source_url,source_kind,route_links,priority,verified_at,review_after")
    .eq("published", true)
    .order("priority", { ascending: false })
    .limit(100);

  if (error || !data) {
    const outcome = fallback(question);
    await recordQuestion(supabase, question, pagePath, outcome, null);
    return NextResponse.json(outcome);
  }

  const freshArticles = (data as KnowledgeArticle[]).filter(isFresh);
  const contextQuestion = `${historyText} ${question}`.trim();
  const ranked = freshArticles
    .map((article) => ({ article, score: scoreArticle(article, contextQuestion) }))
    .sort((a, b) => b.score - a.score);
  const currentRanked = freshArticles
    .map((article) => ({ article, score: scoreArticle(article, question) }))
    .sort((a, b) => b.score - a.score);
  const bestCurrent = currentRanked[0];

  if (planner.active && !planner.timing) {
    const outcome: ConciergeOutcome = {
      answer: `${plannerSummary(planner)} First, roughly when are you planning to return?`,
      links: [{ label: "Settlement support", href: "/services#settlement-relocation" }],
      grounded: false,
      confidence: "medium",
      category: "Return planning",
      sources: [],
      replyType: "clarify",
      prompts: ["Within 3 months", "3–12 months", "More than a year", "Already back in Uganda"],
      planner,
    };
    await recordQuestion(supabase, question, pagePath, outcome, null, looksLikePlannerSelection(question));
    return NextResponse.json(outcome);
  }

  if (planner.active && planner.priorities.length === 0) {
    const outcome: ConciergeOutcome = {
      answer: `${plannerSummary(planner)} What should the plan prioritise first?`,
      links: [{ label: "Explore returnee support", href: "/services" }],
      grounded: false,
      confidence: "medium",
      category: "Return planning",
      sources: [],
      replyType: "clarify",
      prompts: ["Find work", "Start or grow a business", "Invest in Uganda", "Settle my family", "Sort documents"],
      planner,
    };
    await recordQuestion(supabase, question, pagePath, outcome, null, looksLikePlannerSelection(question));
    return NextResponse.json(outcome);
  }

  if (planner.active && planner.timing && planner.priorities.length > 0) {
    const asksSpecificQuestion = /\?|\b(how|what|where|which|can|do i|should i)\b/i.test(question) && !looksLikePlannerSelection(question);
    if (!asksSpecificQuestion || !bestCurrent || bestCurrent.score < 8) {
      const outcome = makePlan(planner, freshArticles);
      const matchedId = freshArticles.find((article) => article.slug === "return-planning")?.id ?? null;
      await recordQuestion(supabase, question, pagePath, outcome, matchedId, looksLikePlannerSelection(question));
      return NextResponse.json(outcome);
    }
  }

  const best = ranked[0];
  if (!best || best.score < 4) {
    const outcome = fallback(question);
    outcome.planner = planner.active ? planner : undefined;
    await recordQuestion(supabase, question, pagePath, outcome, null);
    return NextResponse.json(outcome);
  }

  const article = best.article;
  const links = articleLinks(article).slice(0, 4);
  const highStake = ["Tax & compliance", "Documents", "Citizenship", "Investment", "Property & land"].includes(article.category);
  const outcome: ConciergeOutcome = {
    answer: article.answer,
    grounded: true,
    confidence: best.score >= 16 ? "high" : "medium",
    category: article.category,
    verifiedAt: article.verified_at,
    disclaimer: highStake ? "Requirements, fees and eligibility can change. Confirm the current position at the official source before acting." : null,
    sources: [sourceFor(article)],
    links,
    replyType: "answer",
    planner: planner.active ? planner : undefined,
    prompts: planner.active ? ["Update my return plan", "What should I do first?", "Show me current opportunities"] : undefined,
  };

  await recordQuestion(supabase, question, pagePath, outcome, article.id);
  return NextResponse.json(outcome);
}
