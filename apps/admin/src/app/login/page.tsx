'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

      if (data.user.role !== 'ADMIN') {
        throw new Error('Access denied: Administrator privileges required');
      }

      localStorage.setItem('adminToken', data.accessToken);
      router.push('/clubs');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <h1 className="text-2xl font-bold text-amber-500 mb-2">BotolaHub Admin Login</h1>
        <p className="text-sm text-slate-400 mb-6">Administrator Portal Access Only</p>

        {error && (
          <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-300 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Admin Email</label>
            <input
              type="email"
              required
              id="admin-login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
              placeholder="admin@botolahub.ma"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              id="admin-login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          <button
            type="submit"
            id="admin-login-submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded text-sm transition"
          >
            Authenticate Admin
          </button>
        </form>
      </div>
    </div>
  );
}
