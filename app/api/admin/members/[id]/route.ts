import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Update = z.object({
  membership_status: z.enum(["pending", "active", "expired", "suspended", "rejected"]),
  membership_expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid member." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!actor || !["staff", "admin"].includes(actor.role)) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = Update.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid membership update." }, { status: 422 });

  const { data: member } = await supabase.from("profiles").select("profile_photo_path,membership_status").eq("id", id).maybeSingle();
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  const nextStatus = parsed.data.membership_status;
  const expiry = parsed.data.membership_expires_at;
  if (nextStatus === "active") {
    if (!member.profile_photo_path) return NextResponse.json({ error: "Add a profile photograph before activation." }, { status: 422 });
    if (!expiry) return NextResponse.json({ error: "Set a membership expiry date before activation." }, { status: 422 });
    const end = new Date(`${expiry}T23:59:59Z`);
    if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) return NextResponse.json({ error: "Active membership requires a future expiry date." }, { status: 422 });
  }

  const membership_expires_at = expiry ? `${expiry}T23:59:59Z` : null;
  const { data: updated, error } = await supabase.from("profiles").update({
    membership_status: nextStatus,
    membership_expires_at,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("membership_status,membership_expires_at,member_number").single();

  if (error) return NextResponse.json({ error: error.message.includes("profile photo") ? "Add a profile photograph before activation." : "Membership update failed." }, { status: 400 });
  return NextResponse.json({ ok: true, member: updated });
}
