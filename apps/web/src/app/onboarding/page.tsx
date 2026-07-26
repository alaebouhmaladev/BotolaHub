'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { t, SupportedLocale, getDirection } from '@botolahub/localization';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, accessToken, setAuth } = useAuth();
  const [locale] = useState<SupportedLocale>('en');

  const [clubs, setClubs] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [city, setCity] = useState('Casablanca');
  const [favoriteClubId, setFavoriteClubId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/v1/catalog/clubs')
      .then((res) => res.json())
      .then((data) => {
        setClubs(data);
        if (data.length > 0) setFavoriteClubId(data[0].id);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/profile/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          username,
          displayName,
          firstName,
          lastName,
          birthDate,
          city,
          favoriteClubId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Onboarding failed');
      }

      if (user) {
        setAuth({ ...user, isProfileCompleted: true }, accessToken!);
      }
      router.push('/profile');
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
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <h1 className="text-2xl font-bold text-emerald-400 mb-2">{t(locale, 'completeProfile')}</h1>
        <p className="text-sm text-slate-400 mb-6">
          Select your favorite Botola team and setup your player profile
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-300 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {t(locale, 'username')}
              </label>
              <input
                type="text"
                required
                id="onboarding-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="botolafan"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {t(locale, 'displayName')}
              </label>
              <input
                type="text"
                required
                id="onboarding-displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="Fan Display Name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {t(locale, 'firstName')}
              </label>
              <input
                type="text"
                required
                id="onboarding-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {t(locale, 'lastName')}
              </label>
              <input
                type="text"
                required
                id="onboarding-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {t(locale, 'birthDate')}
              </label>
              <input
                type="date"
                required
                id="onboarding-birthDate"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {t(locale, 'city')}
              </label>
              <input
                type="text"
                required
                id="onboarding-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {t(locale, 'favoriteClub')}
            </label>
            <select
              required
              id="onboarding-favoriteClub"
              value={favoriteClubId}
              onChange={(e) => setFavoriteClubId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.shortName})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            id="onboarding-submit-btn"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded text-sm transition"
          >
            {loading ? '...' : t(locale, 'completeProfile')}
          </button>
        </form>
      </div>
    </div>
  );
}
