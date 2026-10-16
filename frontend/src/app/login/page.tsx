'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, session } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { token, user } = await api.post('/auth/login', { email, password });
      session.save(token, user);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <section className="hidden bg-ink p-12 text-white md:flex md:flex-col md:justify-end">
        <h1 className="max-w-md text-4xl font-semibold leading-tight">Setiap komplain tercatat, diperiksa, dan ditutup.</h1>
        <p className="mt-4 max-w-md text-sm text-slate-300">Portal mutu untuk komplain pelanggan dan klaim FG maupun Non-Forging.</p>
      </section>
      <section className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-xl font-semibold">Masuk ke portal</h2>
          <div>
            <label className="label" htmlFor="email">Email kantor</label>
            <input id="email" className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="pw">Kata sandi</label>
            <input id="pw" className="field" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-forge">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
        </form>
      </section>
    </main>
  );
}
