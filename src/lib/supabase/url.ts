/** Project URL only. The Supabase client appends /rest/v1 and /auth/v1 itself. */
export function supabaseProjectUrl(raw = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  return (raw || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
    .replace(/\/auth\/v1$/i, '');
}
