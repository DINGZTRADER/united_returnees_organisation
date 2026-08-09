import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export type BriefingItem = {
  id: string;
  kind: "news" | "opportunity";
  category: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  cta_label: string;
  published_at: string | null;
  verified_at: string;
};

export async function getBriefingItems(): Promise<BriefingItem[]> {
  const params = new URLSearchParams({
    select: "id,kind,category,title,summary,source_name,source_url,cta_label,published_at,verified_at",
    published: "eq.true",
    order: "priority.desc,published_at.desc.nullslast,created_at.desc",
    limit: "10",
  });

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/briefing_items?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      next: { revalidate: 900 },
    });

    if (!response.ok) return [];
    return (await response.json()) as BriefingItem[];
  } catch {
    return [];
  }
}
