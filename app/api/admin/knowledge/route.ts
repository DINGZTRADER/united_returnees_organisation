import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SourceUrl = z.string().trim().min(1).max(600).refine(
  (value) => value.startsWith("/") || /^https:\/\//i.test(value),
  "Use an internal path or secure source URL.",
);

const BaseKnowledge = z.object({
  slug: z.string().trim().min(3).max(100).regex(/^[a-z0-9-]+$/),
  category: z.string().trim().min(2).max(80),
  question: z.string().trim().min(8).max(240),
  answer: z.string().trim().min(30).max(1600),
  keywords: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  source_name: z.string().trim().min(2).max(140),
  source_url: SourceUrl,
  source_kind: z.enum(["uro", "official"]),
  priority: z.number().int().min(-999).max(999).default(0),
  review_after: z.string().date().nullable().optional(),
  published: z.boolean().default(false),
});

const CreateKnowledge = BaseKnowledge;
const UpdateKnowledge = BaseKnowledge.partial().extend({ id: z.string().uuid() });
const DeleteKnowledge = z.object({ id: z.string().uuid() });

async function getStaffClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) } as const;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["staff", "admin"].includes(profile.role)) {
    return { error: NextResponse.json({ error: "Staff access required." }, { status: 403 }) } as const;
  }
  return { supabase } as const;
}

async function json(request: Request) {
  try { return await request.json(); } catch { return null; }
}

export async function POST(request: Request) {
  const auth = await getStaffClient();
  if ("error" in auth) return auth.error;
  const parsed = CreateKnowledge.safeParse(await json(request));
  if (!parsed.success) return NextResponse.json({ error: "Please check the knowledge article fields." }, { status: 422 });

  const now = new Date().toISOString();
  const { data, error } = await auth.supabase.from("knowledge_articles").insert({
    ...parsed.data,
    route_links: [],
    verified_at: now,
    updated_at: now,
  }).select("*").single();

  if (error) return NextResponse.json({ error: "Could not create the knowledge article. The slug may already exist." }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request) {
  const auth = await getStaffClient();
  if ("error" in auth) return auth.error;
  const parsed = UpdateKnowledge.safeParse(await json(request));
  if (!parsed.success) return NextResponse.json({ error: "Please check the knowledge article fields." }, { status: 422 });

  const { id, ...changes } = parsed.data;
  const { data, error } = await auth.supabase.from("knowledge_articles").update({
    ...changes,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single();

  if (error) return NextResponse.json({ error: "Could not update the knowledge article." }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const auth = await getStaffClient();
  if ("error" in auth) return auth.error;
  const parsed = DeleteKnowledge.safeParse(await json(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid knowledge article." }, { status: 422 });

  const { error } = await auth.supabase.from("knowledge_articles").delete().eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Could not delete the knowledge article." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
