import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url === "https://xxxx.supabase.co") return null;

  if (!_client) {
    _client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return _client;
}
