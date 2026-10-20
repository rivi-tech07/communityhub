'use client';

import { useState, type FormEvent } from 'react';
import { createSupabaseClient, getSupabaseConfig } from '@communityhub/shared';

const config = getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
const supabase = config ? createSupabaseClient(config) : null;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  async function update(event: FormEvent) { event.preventDefault(); setError(''); setMessage(''); if (!supabase) { setError('Supabase is not configured.'); return; } const { error: updateError } = await supabase.auth.updateUser({ password }); if (updateError) setError(updateError.message); else setMessage('Password updated. You can return to the app and sign in.'); }
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">COMMUNITYHUB</p><h1>Choose a new password</h1><p className="muted">Use the secure recovery link from your email.</p><form onSubmit={update}><label>NEW PASSWORD</label><input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /><button className="primary-action">Update password</button></form>{error && <p className="error">{error}</p>}{message && <p className="status">{message}</p>}</section></main>;
}
