import { createBrowserClient } from '@supabase/ssr';
import { supabaseProjectUrl } from './url';

export function createBrowserSupabase() {
  const url = supabaseProjectUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase browser keys are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createBrowserClient(url, key);
}
