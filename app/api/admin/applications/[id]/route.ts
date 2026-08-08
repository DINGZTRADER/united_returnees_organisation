import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Review = z.object({
  status: z.enum(["pending", "approved", "rejected", "suspended"]),
  note: z.string().trim().max(1000).optional().default(""),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid application." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const parsed = Review.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid review." }, { status: 422 });

  const { error } = await supabase.rpc("review_membership_application", {
    p_application_id: id,
    p_status: parsed.data.status,
    p_note: parsed.data.note || null,
  });

  if (error) return NextResponse.json({ error: "You are not authorised to review this application." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
