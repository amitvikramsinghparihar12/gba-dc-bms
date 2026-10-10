'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_PASSWORD } from '@/config/demo';
import { createBrowserSupabase } from '@/lib/supabase/client';

const DEMOS = [
  ['Super Admin', 'rajesh.admin@gba.karnataka.gov.in'],
  ['Director of Finance', 'suresh.df@gba.karnataka.gov.in'],
  ['Finance Officer', 'meera.fo@gba.karnataka.gov.in'],
  ['Creator · DDO 100234', 'ramesh.cr@gba.karnataka.gov.in'],
  ['Creator · DDO 100567', 'anand.cr@gba.karnataka.gov.in'],
  ['Creator · DDO 100235', 'sunil.cr@gba.karnataka.gov.in'],
  ['Verifier', 'priya.vr@gba.karnataka.gov.in'],
  ['Approver', 'k.venkatesh@gba.karnataka.gov.in'],
  ['RTGS Manager', 'sunita.rtgs@gba.karnataka.gov.in'],
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('rajesh.admin@gba.karnataka.gov.in');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function signIn(nextEmail: string, nextPassword: string) {
    setPending(true);
    setError('');
    try {
      const supabase = createBrowserSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: nextEmail.trim(),
        password: nextPassword,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Sign-in failed');
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void signIn(email, password);
  }

  return (
    <main className="min-h-screen bg-[#0f2148] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-white rounded-2xl overflow-hidden shadow-2xl">
        <section className="bg-[#142A5C] text-white p-8 lg:p-10">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-black mb-6">GBA</div>
          <h1 className="text-2xl font-extrabold tracking-tight">DC Bill Management</h1>
          <p className="text-blue-100 text-sm mt-2 leading-relaxed">
            Greater Bengaluru Authority. Bills, DDO budget caps, verification, sanction, and RTGS advice are stored in Supabase.
          </p>
          <p className="text-xs text-blue-200 mt-6">
            Demo password for every seeded account: <span className="font-mono text-white">{DEMO_PASSWORD}</span>
          </p>
          <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {DEMOS.map(([role, demoEmail]) => (
              <button
                key={demoEmail}
                type="button"
                disabled={pending}
                onClick={() => void signIn(demoEmail, DEMO_PASSWORD)}
                className="w-full text-left px-3 py-2 rounded-lg bg-blue-950/70 hover:bg-blue-800 border border-blue-800 text-xs"
              >
                <span className="block font-semibold">{role}</span>
                <span className="block text-blue-200 font-mono">{demoEmail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="p-8 lg:p-10">
          <h2 className="text-xl font-bold text-slate-900">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1">Use a government email and the demo password after the database has been seeded.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
              {pending ? 'Signing in…' : 'Sign in to DC-BMS'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
