import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseProjectUrl } from './url';

export function createAdminClient(): SupabaseClient {
  const url = supabaseProjectUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
