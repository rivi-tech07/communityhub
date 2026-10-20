'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { supabase } from '../../../lib/supabase';

type Control = { user_id: string; status: 'active' | 'blocked' | 'blacklisted'; reason: string; expires_at: string | null; updated_at: string };

export default function AdminUsersPage(): ReactElement {
  const [controls, setControls] = useState<Control[]>([]);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<Control['status']>('blocked');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function request(path: string, init?: RequestInit) {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Administrator sign-in is required.');
    const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, ...(init?.headers ?? {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? 'Request failed.');
    return payload;
  }

  async function load() { try { const result = await request('/api/admin/users/controls'); setControls(result.controls ?? []); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load controls.'); } }
  useEffect(() => { void load(); }, []);
  async function save() { setError(''); setMessage(''); try { await request('/api/admin/users/controls', { method: 'PATCH', body: JSON.stringify({ userId, status, reason, expiresAt: status === 'blocked' ? new Date(expiresAt).toISOString() : null }) }); setMessage('User safety control updated.'); setUserId(''); setReason(''); setExpiresAt(''); await load(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to update control.'); } }

  return <main className="admin-users-page"><a className="back-link" href="/">‹ Admin overview</a><header className="directory-header"><div><p className="eyebrow">ADMIN / USER SAFETY</p><h1>Block and blacklist users</h1><p className="muted">Temporary blocks stop access until expiry. Blacklists are permanent until an administrator restores the account.</p></div><span className="status-pill"><span /> Administrator only</span></header><section className="admin-panel admin-user-form"><div><p className="eyebrow">APPLY CONTROL</p><label>User ID</label><input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Supabase user UUID" /><label>Action</label><select value={status} onChange={(event) => setStatus(event.target.value as Control['status'])}><option value="blocked">Temporary block</option><option value="blacklisted">Blacklist permanently</option><option value="active">Restore access</option></select>{status === 'blocked' && <><label>Block expires</label><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></>}<label>Reason</label><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record a clear moderation reason" /><button className="primary-action" type="button" onClick={() => void save()}>Save safety control</button>{error && <p className="error">{error}</p>}{message && <p className="status">{message}</p>}</div><div className="notice"><strong>Safety rules</strong><p className="muted">Use evidence-based reasons, avoid discriminatory enforcement, and keep an audit trail. The API prevents an administrator from restricting their own account.</p></div></section><section className="admin-section"><div className="section-heading-row"><div><p className="eyebrow">CURRENT CONTROLS</p><h2>Restricted users</h2></div></div>{controls.length === 0 ? <div className="empty-state"><strong>No platform restrictions</strong><p>Personal user blocks remain separate from administrator controls.</p></div> : <div className="admin-control-list">{controls.map((control) => <article className="control-row" key={control.user_id}><div><strong>{control.user_id}</strong><p>{control.reason}</p></div><span className={`control-status ${control.status}`}>{control.status}</span><small>{control.expires_at ? `Expires ${new Date(control.expires_at).toLocaleString()}` : 'No expiry'}</small></article>)}</div>}</section></main>;
}
