import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const UpdateQuestion = z.object({
  id: z.string().uuid(),
  review_status: z.enum(["open", "reviewed", "dismissed"]),
});
const DeleteQuestion = z.object({ id: z.string().uuid() });

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

export async function PATCH(request: Request) {
  const auth = await getStaffClient();
  if ("error" in auth) return auth.error;
  const parsed = UpdateQuestion.safeParse(await json(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review update." }, { status: 422 });

  const reviewedAt = parsed.data.review_status === "open" ? null : new Date().toISOString();
  const { data, error } = await auth.supabase
    .from("concierge_questions")
    .update({ review_status: parsed.data.review_status, reviewed_at: reviewedAt })
    .eq("id", parsed.data.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Could not update this question." }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const auth = await getStaffClient();
  if ("error" in auth) return auth.error;
  const parsed = DeleteQuestion.safeParse(await json(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid question." }, { status: 422 });

  const { error } = await auth.supabase.from("concierge_questions").delete().eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Could not delete this question." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
