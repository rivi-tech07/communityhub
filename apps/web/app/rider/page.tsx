'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient, getSupabaseConfig } from '@communityhub/shared';

type Stop = { id: string; business_id: string; order_id: string; stop_order: number; status: string };
type Run = { id: string; status: string; delivery_address: Record<string, unknown>; delivery_run_stops: Stop[] };
type ProofType = 'pickup_selfie' | 'pickup_items' | 'delivery_selfie';

const config = getSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
const supabase = config ? createSupabaseClient(config) : null;

export default function RiderPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function call(path: string, init?: RequestInit) {
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) throw new Error('Sign in as an assigned rider first.');
    const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? 'Request failed.');
    return payload;
  }

  async function load() {
    try { const payload = await call('/api/delivery/runs?status=assigned'); setRuns(payload.runs ?? []); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load assigned deliveries.'); }
  }

  async function uploadProof(runId: string, proofType: ProofType, file: File, stopId?: string) {
    setBusy(true); setMessage('');
    try {
      const payload = await call(`/api/delivery/runs/${runId}/proofs`, { method: 'POST', body: JSON.stringify({ proofType, stopId, fileName: file.name, mimeType: file.type, sizeBytes: file.size }) });
      if (!supabase || !payload.upload?.path || !payload.upload?.token) throw new Error('Upload session is unavailable.');
      const { error } = await supabase.storage.from('delivery-proofs').uploadToSignedUrl(payload.upload.path, payload.upload.token, file);
      if (error) throw error;
      setMessage('Proof uploaded securely.');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to upload proof.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, []);

  return <main className="rider-page"><header className="community-web-header"><a href="/" className="community-web-brand">✦ Community<span>Hub</span></a><nav className="community-web-actions"><a href="/">Home</a><a href="/profile">Profile</a></nav></header><section className="rider-shell"><p className="eyebrow">COMMUNITYHUB / RIDER</p><h1>Assigned deliveries</h1><p className="muted">Only orders assigned to your rider account appear here.</p>{message && <p className="status">{message}</p>}{runs.length === 0 ? <div className="empty-state"><strong>No assigned deliveries</strong><p>New delivery runs will appear here when dispatch assigns them to you.</p></div> : runs.map((run) => <article className="rider-run" key={run.id}><div className="rider-run-heading"><div><h2>Delivery run</h2><p className="muted">Status: {run.status.replaceAll('_', ' ')}</p></div><span className="rider-lock">Address read-only</span></div><div className="rider-address"><strong>Deliver to</strong><span>{Object.values(run.delivery_address).filter(Boolean).join(', ') || 'Address provided by customer'}</span></div><div className="rider-stops">{run.delivery_run_stops.sort((a, b) => a.stop_order - b.stop_order).map((stop) => <div className="rider-stop" key={stop.id}><div><strong>Shop stop {stop.stop_order}</strong><small>Order {stop.order_id.slice(0, 8)} · {stop.status.replaceAll('_', ' ')}</small></div><label className="proof-upload">Pickup selfie<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProof(run.id, 'pickup_selfie', file, stop.id); }} /></label><label className="proof-upload">Item photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProof(run.id, 'pickup_items', file, stop.id); }} /></label></div>)}</div><label className="proof-upload delivery-proof">Delivery selfie<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProof(run.id, 'delivery_selfie', file); }} /></label></article>)}</section></main>;
}
