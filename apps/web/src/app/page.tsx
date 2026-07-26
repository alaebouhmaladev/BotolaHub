'use client';

import { useState, useEffect } from 'react';
import { SupportedLocale, getDirection, t } from '@botolahub/localization';

export default function HomePage() {
  const [locale, setLocale] = useState<SupportedLocale>('en');

  const dir = getDirection(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.body.dir = dir;
  }, [locale, dir]);

  return (
    <main className="container" dir={dir}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#008751' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>BotolaHub</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['en', 'fr', 'ar'] as SupportedLocale[]).map((loc) => (
            <button
              key={loc}
              onClick={() => setLocale(loc)}
              className={`btn-lang ${locale === loc ? 'active' : ''}`}
            >
              {loc.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <section className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <span className="badge-gold">Botola Pro Inwi</span>
        </div>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1rem' }}>
          {t(locale, 'welcomeTitle')}
        </h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '1.125rem',
            maxWidth: 600,
            margin: '0 auto 2rem',
          }}
        >
          {t(locale, 'welcomeSubtitle')}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span className="badge-green">{t(locale, 'predictionLockNotice')}</span>
          <span className="badge-red">{t(locale, 'notFantasyNotice')}</span>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            1X2 Match Predictions
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Predict Home Win (1), Draw (X), or Away Win (2) for every scheduled Botola Pro fixture.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Favorite Club Multiplier
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Earn +4/-2 points on your favorite club&apos;s matches (+3/-1 on standard fixtures).
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Global & Private Leagues
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Compete on weekly & season-long global leaderboards or create private mini-leagues with
            friends.
          </p>
        </div>
      </section>
    </main>
  );
}
