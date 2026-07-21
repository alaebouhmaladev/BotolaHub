'use client';

import { getLayoutDirection, getTranslation, SupportedLanguage } from '@botolahub/localization';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const [apiHealth, setApiHealth] = useState<string>('Checking...');

  const t = getTranslation(lang);
  const dir = getLayoutDirection(lang);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('http://localhost:3001/api/v1/health');
        if (res.ok) {
          const data = await res.json();
          setApiHealth(`Status: ${data.status} | DB: ${data.services?.database} | Redis: ${data.services?.redis}`);
        } else {
          setApiHealth('API Offline (Status ' + res.status + ')');
        }
      } catch (e) {
        setApiHealth('API Offline');
      }
    }
    checkHealth();
  }, []);

  return (
    <div className="container" dir={dir}>
      <header className="header">
        <div className="brand">
          <div className="logo-icon">BH</div>
          <h1 className="title">{t.appName}</h1>
        </div>

        <div className="lang-selector">
          <button
            className={`lang-btn ${lang === 'ar' ? 'active' : ''}`}
            onClick={() => setLang('ar')}
          >
            العربية
          </button>
          <button
            className={`lang-btn ${lang === 'fr' ? 'active' : ''}`}
            onClick={() => setLang('fr')}
          >
            Français
          </button>
          <button
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >
            English
          </button>
        </div>
      </header>

      <main className="hero-card">
        <p className="hero-tagline">{t.tagline}</p>
        <h2 className="hero-welcome">{t.welcome}</h2>

        <div className="badges">
          <div className="badge">
            <span className="badge-dot"></span>
            {t.status.healthy}: {apiHealth}
          </div>
          <div className="badge">
            <span>🌍 {lang.toUpperCase()} ({dir.toUpperCase()})</span>
          </div>
          <div className="badge">
            <span>⚽ Botola Pro 2026</span>
          </div>
        </div>
      </main>
    </div>
  );
}
