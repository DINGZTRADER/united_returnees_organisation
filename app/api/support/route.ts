import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SupportRequest = z.object({
  category: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(3).max(160),
  details: z.string().trim().min(10).max(4000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = SupportRequest.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete all support fields." }, { status: 422 });
  }

  const { error } = await supabase.from("support_requests").insert({
    member_id: user.id,
    ...parsed.data,
  });

  if (error) {
    console.error("support_request_failed", error.message);
    return NextResponse.json({ error: "Could not create the support request." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
