import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const BaseBriefing = z.object({
  kind: z.enum(["news", "opportunity"]),
  category: z.string().trim().min(2).max(80),
  title: z.string().trim().min(8).max(220),
  summary: z.string().trim().min(20).max(700),
  source_name: z.string().trim().min(2).max(140),
  source_url: z.string().url().max(600),
  cta_label: z.string().trim().min(2).max(80).default("Read at source"),
  published_at: z.string().datetime({ offset: true }).nullable().optional(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  priority: z.number().int().min(-999).max(999).default(0),
  published: z.boolean().default(false),
});

const CreateBriefing = BaseBriefing;
const UpdateBriefing = BaseBriefing.partial().extend({ id: z.string().uuid() });
const DeleteBriefing = z.object({ id: z.string().uuid() });

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
  const parsed = CreateBriefing.safeParse(await json(request));
  if (!parsed.success) return NextResponse.json({ error: "Please check the briefing fields." }, { status: 422 });

  const payload = {
    ...parsed.data,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await auth.supabase.from("briefing_items").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: "Could not create briefing item." }, { status: 400 });
  revalidatePath("/");
  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request) {
  const auth = await getStaffClient();
  if ("error" in auth) return auth.error;
  const parsed = UpdateBriefing.safeParse(await json(request));
  if (!parsed.success) return NextResponse.json({ error: "Please check the briefing fields." }, { status: 422 });

  const { id, ...changes } = parsed.data;
  const payload = {
    ...changes,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await auth.supabase.from("briefing_items").update(payload).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: "Could not update briefing item." }, { status: 400 });
  revalidatePath("/");
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const auth = await getStaffClient();
  if ("error" in auth) return auth.error;
  const parsed = DeleteBriefing.safeParse(await json(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid briefing item." }, { status: 422 });

  const { error } = await auth.supabase.from("briefing_items").delete().eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Could not delete briefing item." }, { status: 400 });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
