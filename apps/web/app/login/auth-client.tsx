'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createSupabaseClient, getCooldownRemaining, getSupabaseConfig } from '@communityhub/shared';

type Mode = 'email' | 'phone';
const config = getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
const supabase = config ? createSupabaseClient(config) : null;

export default function AuthClient() {
  const [mode, setMode] = useState<Mode>('email');
  const [isRegistering, setIsRegistering] = useState(false);
  const [usePassword, setUsePassword] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const resendDisabled = remaining > 0 || busy;

  useEffect(() => { if (!sentAt) return; const timer = window.setInterval(() => setRemaining(getCooldownRemaining(sentAt)), 1000); return () => window.clearInterval(timer); }, [sentAt]);
  useEffect(() => { if (sentAt) setRemaining(getCooldownRemaining(sentAt)); }, [sentAt]);
  const title = useMemo(() => recovery ? 'Recover your account' : isRegistering ? 'Join your community' : 'Welcome back', [recovery, isRegistering]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setStatus('');
    if (!supabase) { setError('Authentication is not configured. Add Supabase variables first.'); setBusy(false); return; }
    try {
      if (recovery) {
        if (mode !== 'email') throw new Error('Password recovery is currently available by email only.');
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(identifier, { redirectTo: `${window.location.origin}/reset-password` });
        if (recoveryError) throw recoveryError;
        setStatus('Recovery email request accepted. Check your inbox if the address exists.');
      } else if (mode === 'email' || usePassword) {
        if (!password) throw new Error('Enter a password.');
        const result = isRegistering ? await supabase.auth.signUp({ email: identifier, password }) : await supabase.auth.signInWithPassword({ email: identifier, password });
        if (result.error) throw result.error;
        setStatus(isRegistering && !result.data.session ? 'Registration accepted. Check your email to verify your address.' : 'Signed in.');
      } else if (!sentAt) {
        const { error: otpError } = await supabase.auth.signInWithOtp({ phone: identifier, options: { shouldCreateUser: isRegistering } });
        if (otpError) throw otpError;
        const now = Date.now(); setSentAt(now); setRemaining(60); setStatus('OTP request accepted by Supabase. Enter the code only after it arrives.');
      } else {
        const { error: verifyError } = await supabase.auth.verifyOtp({ phone: identifier, token: otp, type: 'sms' });
        if (verifyError) throw verifyError;
        setStatus('Phone verified and signed in.');
      }
    } catch (authError) { setError(normalizeAuthError(authError)); } finally { setBusy(false); }
  }

  function switchMode(next: Mode) { setMode(next); setSentAt(null); setOtp(''); setError(''); setStatus(''); setUsePassword(next === 'email'); }
  return <main className="auth-page"><section className="auth-card"><div className="auth-mark">✦</div><p className="eyebrow">COMMUNITYHUB</p><h1>{title}</h1><p className="muted">Use a verified identity to keep the community safe.</p><div className="auth-tabs"><button className={mode === 'email' ? 'selected' : ''} onClick={() => switchMode('email')}>Email</button><button className={mode === 'phone' ? 'selected' : ''} onClick={() => switchMode('phone')}>Phone / SMS</button></div><form onSubmit={submit}><label>{mode === 'email' ? 'EMAIL ADDRESS' : 'PHONE NUMBER'}</label><input type={mode === 'email' ? 'email' : 'tel'} required value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={mode === 'email' ? 'you@example.com' : '+91 98765 43210'} /><label>PASSWORD {mode === 'phone' && <button type="button" className="inline-control" onClick={() => setUsePassword(!usePassword)}>{usePassword ? 'Use SMS code instead' : 'Use password instead'}</button>}</label>{(mode === 'email' || usePassword) && <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} />}{mode === 'phone' && !usePassword && sentAt && <><label>SMS CODE <span className="cooldown">{remaining ? `Resend in ${remaining}s` : 'You can resend'}</span></label><input inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="123456" /><button type="button" className="secondary-action" disabled={resendDisabled} onClick={() => { setSentAt(null); setOtp(''); }}>Resend code</button></>}<button className="primary-action" disabled={busy || (mode === 'phone' && !usePassword && !sentAt && remaining > 0)}>{busy ? 'Working…' : recovery ? 'Send recovery email' : sentAt && mode === 'phone' && !usePassword ? 'Verify code' : isRegistering ? 'Create account' : 'Sign in'}</button></form>{error && <p className="error">{error}</p>}{status && <p className="status">{status}</p>}<div className="auth-footer"><button onClick={() => { setRecovery(!recovery); setError(''); setStatus(''); }}>{recovery ? 'Back to sign in' : 'Forgot password?'}</button><button onClick={() => { setIsRegistering(!isRegistering); setRecovery(false); setError(''); setStatus(''); }}>{isRegistering ? 'Already have an account?' : 'Create an account'}</button></div></section></main>;
}

function normalizeAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Authentication failed.';
  if (/rate limit|too many|429/i.test(message)) return 'Too many attempts. Wait a little before trying again.';
  if (/expired|invalid.*token|otp/i.test(message)) return 'That code is invalid or expired. Request a new code and try again.';
  if (/already registered|already exists|user already/i.test(message)) return 'An account with this identity already exists. Try signing in instead.';
  if (/invalid login credentials/i.test(message)) return 'The credentials do not match an account.';
  if (/provider|sms|phone/i.test(message)) return 'SMS delivery is not configured or the provider rejected this request.';
  return message;
}
