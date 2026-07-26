'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { t, SupportedLocale, getDirection } from '@botolahub/localization';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [locale, setLocale] = useState<SupportedLocale>('en');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Type': 'WEB' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      setAuth(data.user, data.accessToken);
      if (!data.user.isProfileCompleted) {
        router.push('/onboarding');
      } else {
        router.push('/profile');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const dir = getDirection(locale);

  return (
    <div
      dir={dir}
      className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4"
    >
      {/* Header controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        {(['en', 'fr', 'ar'] as SupportedLocale[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLocale(lang)}
            className={`px-3 py-1 rounded text-sm font-semibold uppercase ${
              locale === lang
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <h1 className="text-2xl font-bold text-emerald-400 mb-2">{t(locale, 'login')}</h1>
        <p className="text-sm text-slate-400 mb-6">{t(locale, 'welcomeSubtitle')}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-300 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {t(locale, 'email')}
            </label>
            <input
              type="email"
              required
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {t(locale, 'password')}
            </label>
            <input
              type="password"
              required
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded text-sm transition"
          >
            {loading ? '...' : t(locale, 'login')}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <a href="/register" className="text-emerald-400 hover:underline">
            {t(locale, 'register')}
          </a>
        </div>
      </div>
    </div>
  );
}
