'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, session } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    // Support both ID/username (e.g. 'admin') and full email format
    const email = identifier.trim();

    try {
      const { token, user } = await api.post('/auth/login', { email, password });
      session.save(token, user);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'ID atau password salah.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/factory_background.jpg')` }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Main Login Card - Exactly 1:1 with reference screenshot */}
      <div className="relative z-10 w-full max-w-[480px] rounded-2xl bg-white px-8 py-9 sm:px-11 sm:py-10 shadow-2xl border-t-[3.5px] border-sky-400 text-slate-800 transition-all">
        {/* Company Logo */}
        <div className="flex justify-center mb-5">
          <img
            src="/logo-mtm.jpg"
            alt="PT Menara Terus Makmur - A Member of ASTRA Otoparts Group"
            className="h-10 sm:h-11 w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/asset/logo-mtm.jpg';
            }}
          />
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-7">
          <h1 className="text-sm font-bold tracking-[0.2em] text-slate-800 uppercase">
            QUALITY COMPLAINT SYSTEM
          </h1>
          <p className="mt-1 text-[11px] text-slate-500 font-normal">
            Sistem Komplain Pelanggan PT Menara Terus Makmur
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={submit} className="space-y-4">
          {/* ID / NPK Karyawan */}
          <div>
            <label
              htmlFor="identifier"
              className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
            >
              ID / NPK KARYAWAN
            </label>
            <div className="relative flex items-center rounded-lg border border-slate-300 bg-white transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="pointer-events-none pl-3.5 text-slate-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </span>
              <input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan ID atau NPK Anda"
                className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
            >
              PASSWORD
            </label>
            <div className="relative flex items-center rounded-lg border border-slate-300 bg-white transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="pointer-events-none pl-3.5 text-slate-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700"
            >
              <svg className="h-4 w-4 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full mt-6 flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memeriksa…
              </span>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Masuk ke Sistem</span>
              </>
            )}
          </button>
        </form>

        {/* Copyright Footer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-normal">
            © 2026 PT Menara Terus Makmur · Sistem Mutu & Komplain Pelanggan
          </p>
        </div>
      </div>
    </main>
  );
}
