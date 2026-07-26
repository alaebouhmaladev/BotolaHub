'use client';

import React, { useState, useEffect } from 'react';

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [code, setCode] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#008751');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [auditReason, setAuditReason] = useState('Added team via admin dashboard');
  const [status, setStatus] = useState<string | null>(null);

  const fetchClubs = async () => {
    try {
      const res = await fetch('/api/v1/catalog/clubs');
      if (res.ok) setClubs(await res.json());
    } catch {
      // Ignore network errors fetching initial catalog
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    const token = localStorage.getItem('adminToken');

    try {
      const res = await fetch('/api/v1/admin/clubs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          shortName,
          code,
          primaryColor,
          secondaryColor,
          auditReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Creation failed');
      }

      setStatus(`Successfully created club ${name}`);
      setName('');
      setShortName('');
      setCode('');
      fetchClubs();
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-amber-500">Botola Pro Clubs Management</h1>

        {status && (
          <div className="p-3 bg-slate-900 border border-slate-800 text-amber-400 rounded text-sm">
            {status}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Create New Club</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Club Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 text-sm"
                placeholder="Raja CA"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Short Name</label>
              <input
                type="text"
                required
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 text-sm"
                placeholder="RCA"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 text-sm"
                placeholder="RCA_TEST"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Primary Color</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Secondary Color
              </label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Audit Reason</label>
              <input
                type="text"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 text-sm"
              />
            </div>
            <div className="col-span-3">
              <button
                type="submit"
                className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-sm"
              >
                Save & Record Audit Log
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">
            Existing Botola Clubs ({clubs.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {clubs.map((c) => (
              <div
                key={c.id}
                className="p-3 bg-slate-950 rounded border border-slate-800 text-xs flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-slate-200">{c.name}</p>
                  <p className="text-slate-500">{c.code}</p>
                </div>
                <div
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: c.primaryColor }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
