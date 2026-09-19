import "server-only";

export type PublicSupabaseConfig = { url: string; key: string };

function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return url.protocol === "https:" || (url.protocol === "http:" && loopback);
  } catch {
    return false;
  }
}

export function readPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

  if (!url || !key || !isAllowedUrl(url) || key.length > 4_096) return null;
  return { url, key };
}

export function getEnabledPublicSupabaseConfig(): PublicSupabaseConfig | null {
  if (process.env.WATCHTVSPORT_DATA_SOURCE?.trim() !== "supabase") return null;
  return readPublicSupabaseConfig();
}
