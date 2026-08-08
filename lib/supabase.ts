export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function insertMembershipApplication(record: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { ok: false as const, reason: "not_configured" as const };
  const response = await fetch(`${url}/rest/v1/membership_applications`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(record),
    cache: "no-store",
  });
  return response.ok ? { ok: true as const } : { ok: false as const, reason: "insert_failed" as const };
}
