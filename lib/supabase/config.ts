export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qzzfkebvfsltohxqquza.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_VGNnWBj5vFZYSCS_MJs8sQ_hAr64fBu";

export const hasSupabaseConfig = () => Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
