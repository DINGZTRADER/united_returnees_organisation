import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Application = z.object({
  user_id: z.string().uuid().nullable().optional(),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(7).max(40),
  current_country: z.string().trim().min(2).max(100),
  return_status: z.enum(["planning", "returned"]),
  return_date: z.string().optional().default(""),
  district: z.string().trim().max(100).optional().default(""),
  professional_background: z.string().trim().max(220).optional().default(""),
  skills: z.string().trim().max(2000).optional().default(""),
  support_needs: z.string().trim().min(3).max(3000),
  consent: z.literal("yes"),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = Application.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the application and try again." },
      { status: 422 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email && user.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return NextResponse.json({ error: "Account email mismatch." }, { status: 403 });
  }

  const userId = user?.id ?? parsed.data.user_id ?? null;
  const { data, error } = await supabase.rpc("submit_membership_application", {
    p_user_id: userId,
    p_full_name: parsed.data.full_name,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone,
    p_current_country: parsed.data.current_country,
    p_return_status: parsed.data.return_status,
    p_return_date: parsed.data.return_date || null,
    p_district: parsed.data.district || null,
    p_professional_background: parsed.data.professional_background || null,
    p_skills: parsed.data.skills || null,
    p_support_needs: parsed.data.support_needs,
  });

  if (error) {
    console.error("membership_application_failed", error.message);
    return NextResponse.json(
      { error: "We could not save your application. Please contact URO on WhatsApp." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, application_id: data });
}
