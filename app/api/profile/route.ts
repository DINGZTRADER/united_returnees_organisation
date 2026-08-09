import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Profile = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).default(""),
  current_country: z.string().trim().max(100).default(""),
  return_status: z.enum(["planning", "returned"]),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
  district: z.string().trim().max(100).default(""),
  professional_background: z.string().trim().max(1200).default(""),
  skills: z.string().trim().max(1200).default(""),
  business_interests: z.string().trim().max(1200).default(""),
  investment_interests: z.string().trim().max(1200).default(""),
  support_needs: z.string().trim().max(2000).default(""),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = Profile.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Please check the profile fields and try again." }, { status: 422 });

  const data = parsed.data;
  const { error } = await supabase.from("profiles").update({
    full_name: data.full_name,
    phone: data.phone || null,
    current_country: data.current_country || null,
    return_status: data.return_status,
    return_date: data.return_date || null,
    district: data.district || null,
    professional_background: data.professional_background || null,
    skills: data.skills || null,
    business_interests: data.business_interests || null,
    investment_interests: data.investment_interests || null,
    support_needs: data.support_needs || null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  if (error) return NextResponse.json({ error: "Profile update failed." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photograph to upload." }, { status: 400 });
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Photo must be smaller than 5 MB." }, { status: 413 });

  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const ext = extensions[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 415 });

  const { data: existing } = await supabase.from("profiles").select("profile_photo_path").eq("id", user.id).maybeSingle();
  const path = `${user.id}/profile-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from("member-photos").upload(path, bytes, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: "Photo upload failed." }, { status: 400 });

  const { error: updateError } = await supabase.from("profiles").update({
    profile_photo_path: path,
    profile_photo_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  if (updateError) {
    await supabase.storage.from("member-photos").remove([path]);
    return NextResponse.json({ error: "Photo could not be attached to your profile." }, { status: 400 });
  }

  if (existing?.profile_photo_path && existing.profile_photo_path !== path) {
    await supabase.storage.from("member-photos").remove([existing.profile_photo_path]);
  }

  const { data: signed } = await supabase.storage.from("member-photos").createSignedUrl(path, 3600);
  return NextResponse.json({ ok: true, photoUrl: signed?.signedUrl ?? null });
}
