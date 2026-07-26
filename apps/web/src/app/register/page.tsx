'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { t, SupportedLocale, getDirection } from '@botolahub/localization';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [locale] = useState<SupportedLocale>('en');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Type': 'WEB' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setAuth(data.user, data.accessToken);
      router.push('/onboarding');
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
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <h1 className="text-2xl font-bold text-emerald-400 mb-2">{t(locale, 'register')}</h1>
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
              id="register-email"
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
              id="register-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            id="register-submit-btn"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded text-sm transition"
          >
            {loading ? '...' : t(locale, 'register')}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <a href="/login" className="text-emerald-400 hover:underline">
            {t(locale, 'login')}
          </a>
        </div>
      </div>
    </div>
  );
}
