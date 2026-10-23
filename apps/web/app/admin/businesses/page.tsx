'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

type Business = { id: string; name: string; category: string; city: string | null; country: string | null; verification_status: string; is_published: boolean; created_at: string };

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [message, setMessage] = useState('Loading business approvals…');
  const [error, setError] = useState('');

  async function request(path: string, init?: RequestInit) {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Administrator or moderator sign-in is required.');
    const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, ...(init?.headers ?? {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? 'Request failed.');
    return payload;
  }

  async function load() {
    try { const payload = await request('/api/admin/businesses'); setBusinesses(payload.businesses ?? []); setMessage(''); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load approvals.'); setMessage(''); }
  }
  useEffect(() => { void load(); }, []);

  async function update(businessId: string, status: 'verified' | 'rejected' | 'pending', published: boolean) {
    setError('');
    try { await request('/api/admin/businesses', { method: 'PATCH', body: JSON.stringify({ businessId, status, published }) }); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save approval.'); }
  }

  return <main className="admin-users-page"><a className="back-link" href="/">‹ Admin overview</a><header className="directory-header"><div><p className="eyebrow">ADMIN / BUSINESS APPROVALS</p><h1>Review local businesses</h1><p className="muted">Approve a shop before it appears in the public directory.</p></div><a className="secondary-action" href="/admin/users">User safety</a></header>{error && <p className="error">{error}</p>}{message && <p className="muted">{message}</p>}<section className="admin-control-list">{businesses.map((business) => <article className="control-row" key={business.id}><div><strong>{business.name}</strong><p>{business.category} · {business.city ?? business.country ?? 'Location not added'}</p><small>{business.verification_status} · {business.is_published ? 'public' : 'not public'}</small></div><div className="profile-photo-actions"><button className="primary-action" type="button" onClick={() => void update(business.id, 'verified', true)}>Approve and publish</button><button className="text-action" type="button" onClick={() => void update(business.id, 'rejected', false)}>Reject</button></div></article>)}{!message && !businesses.length && <div className="empty-state"><strong>No businesses waiting for review</strong><p>New owner listings will appear here after registration.</p></div>}</section></main>;
}
