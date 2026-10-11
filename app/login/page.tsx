'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const supabase = createBrowserSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0f2148] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black mb-6">GBA</div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">DC Bill Management</h1>
        <p className="text-sm text-slate-500 mt-2">Sign in with the email and password issued for your role.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </label>
          {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg py-2.5 text-sm disabled:bg-slate-400"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
