'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { t, SupportedLocale, getDirection } from '@botolahub/localization';

export default function ProfilePage() {
  const router = useRouter();
  const { accessToken, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [locale] = useState<SupportedLocale>('en');

  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
      })
      .catch(() => {});
  }, [accessToken]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const dir = getDirection(locale);

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-emerald-400">Player Profile</h1>
          <button
            onClick={handleLogout}
            id="profile-logout-btn"
            className="px-4 py-2 bg-red-900 hover:bg-red-800 text-red-200 font-semibold rounded text-xs"
          >
            {t(locale, 'logout')}
          </button>
        </div>

        {profile ? (
          <div className="space-y-4 text-sm text-slate-300">
            <div className="p-4 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-slate-100">{profile.displayName}</p>
                <p className="text-xs text-emerald-400">@{profile.username}</p>
              </div>
              <div
                className="px-3 py-1.5 rounded font-bold text-xs"
                style={{
                  backgroundColor: profile.favoriteClub?.primaryColor || '#008751',
                  color: profile.favoriteClub?.secondaryColor || '#FFF',
                }}
              >
                {profile.favoriteClub?.shortName}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-xs text-slate-500 block">Location</span>
                <span className="font-semibold">{profile.city}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-xs text-slate-500 block">Favorite Club</span>
                <span className="font-semibold">{profile.favoriteClub?.name}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Loading player profile...</p>
        )}
      </div>
    </div>
  );
}
