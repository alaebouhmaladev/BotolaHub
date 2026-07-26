'use client';

import { useState, useEffect } from 'react';
import { ReadinessCheckResponse } from '@botolahub/contracts';

export default function AdminDashboardPage() {
  const [readiness, setReadiness] = useState<ReadinessCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/v1/health/ready`);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();
        setReadiness(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="container">
      <header
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>BotolaHub Admin</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Infrastructure & System Health Dashboard
          </p>
        </div>
        <div
          style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: 8 }}
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Version: </span>
          <span style={{ fontWeight: 600 }}>0.1.0-dev</span>
        </div>
      </header>

      <section className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          System Environment & Readiness
        </h2>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Checking infrastructure health...</p>
        ) : error ? (
          <div className="status-item" style={{ borderColor: 'var(--restrained-red)' }}>
            <p style={{ color: '#FF6B5B' }}>
              Failed to connect to API readiness endpoint ({error}).
            </p>
          </div>
        ) : (
          <div className="status-grid">
            <div className="status-item">
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Environment</p>
              <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                {readiness?.environment || 'local'}
              </p>
            </div>

            <div className="status-item">
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>API Status</p>
              <p className={readiness?.status === 'ok' ? 'status-ok' : 'status-error'}>
                {readiness?.status.toUpperCase()}
              </p>
            </div>

            <div className="status-item">
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                PostgreSQL Health
              </p>
              <p
                className={
                  readiness?.dependencies.postgres.status === 'ok' ? 'status-ok' : 'status-error'
                }
              >
                {readiness?.dependencies.postgres.status.toUpperCase()}
                {readiness?.dependencies.postgres.latencyMs !== undefined &&
                  ` (${readiness.dependencies.postgres.latencyMs}ms)`}
              </p>
            </div>

            <div className="status-item">
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Redis Health</p>
              <p
                className={
                  readiness?.dependencies.redis.status === 'ok' ? 'status-ok' : 'status-error'
                }
              >
                {readiness?.dependencies.redis.status.toUpperCase()}
                {readiness?.dependencies.redis.latencyMs !== undefined &&
                  ` (${readiness.dependencies.redis.latencyMs}ms)`}
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
