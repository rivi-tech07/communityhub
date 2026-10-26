'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

type Report = { id: string; reason: string; status: string; created_at: string };

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [message, setMessage] = useState('Loading moderation queue…');

  useEffect(() => {
    async function load() {
      if (!supabase) return setMessage('Authentication is not configured.');
      const { data } = await supabase.auth.getSession();
      if (!data.session) return setMessage('Administrator or moderator sign-in is required.');
      const response = await fetch('/api/moderation/reports', {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(body.error ?? 'Unable to load moderation queue.');
      setReports(body.reports ?? []);
      setMessage('');
    }
    void load();
  }, []);

  return (
    <main className="admin-users-page">
      <a className="back-link" href="/admin/businesses">
        ‹ Admin overview
      </a>
      <header className="directory-header">
        <div>
          <p className="eyebrow">ADMIN / SAFETY</p>
          <h1>Moderation queue</h1>
          <p className="muted">Review reported community content and keep an audit trail.</p>
        </div>
      </header>
      {message && <p className="status">{message}</p>}
      {!message && reports.length === 0 && <p className="empty-state">No reports to review.</p>}
      {!message && reports.length > 0 && (
        <section aria-label="Reported content" className="admin-control-list">
          {reports.map((report) => (
            <article className="control-row" key={report.id}>
              <div>
                <strong>{report.reason}</strong>
                <p>{new Date(report.created_at).toLocaleString()}</p>
              </div>
              <span className={`control-status ${report.status}`}>{report.status}</span>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
