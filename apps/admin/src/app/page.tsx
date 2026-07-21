import { getTranslation } from '@botolahub/localization';

export default function AdminPage() {
  const t = getTranslation('en');

  return (
    <div>
      <header className="admin-header">
        <h1 className="admin-title">⚙️ {t.appName} Admin Portal</h1>
        <div>Status: System Healthy</div>
      </header>

      <main className="dashboard-grid">
        <div className="card">
          <h3>Active Season</h3>
          <div className="value">Botola Pro 2026</div>
        </div>

        <div className="card">
          <h3>Ingestion Provider</h3>
          <div className="value">Mock Football Data</div>
        </div>

        <div className="card">
          <h3>Fantasy Engine</h3>
          <div className="value">Operational (Pure)</div>
        </div>
      </main>
    </div>
  );
}
