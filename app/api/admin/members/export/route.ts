import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function cell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!actor || !["staff", "admin"].includes(actor.role)) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const { data, error } = await supabase.from("profiles").select("member_number,full_name,email,phone,current_country,return_status,return_date,district,professional_background,skills,business_interests,investment_interests,support_needs,membership_status,membership_expires_at,created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Export failed." }, { status: 500 });

  const headers = ["Member Number","Full Name","Email","Phone","Current Country","Return Status","Return Date","District","Professional Background","Skills","Business Interests","Investment Interests","Support Needs","Membership Status","Membership Expires","Registered"];
  const keys = ["member_number","full_name","email","phone","current_country","return_status","return_date","district","professional_background","skills","business_interests","investment_interests","support_needs","membership_status","membership_expires_at","created_at"] as const;
  const csv = [headers.map(cell).join(","), ...(data ?? []).map((row) => keys.map((key) => cell(row[key])).join(","))].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="uro-members-${new Date().toISOString().slice(0,10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
