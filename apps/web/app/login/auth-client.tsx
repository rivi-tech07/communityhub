'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { getCooldownRemaining, getSupabaseConfig, type Database } from '@communityhub/shared';

type Mode = 'email' | 'phone';
type Registration = {
  fullName: string;
  mobile: string;
  dateOfBirth: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

const config = getSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
const supabase = config ? createBrowserClient<Database>(config.url, config.anonKey) : null;

const emptyRegistration: Registration = {
  fullName: '',
  mobile: '',
  dateOfBirth: '',
  confirmPassword: '',
  termsAccepted: false,
};

export default function AuthClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('email');
  const [isRegistering, setIsRegistering] = useState(false);
  const [usePassword, setUsePassword] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [registration, setRegistration] = useState<Registration>(emptyRegistration);
  const [otp, setOtp] = useState('');
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);

  const resendDisabled = remaining > 0 || busy;
  const title = useMemo(
    () => (recovery ? 'Recover your account' : isRegistering ? 'Join your community' : 'Welcome back'),
    [recovery, isRegistering],
  );

  useEffect(() => {
    if (!sentAt) return;
    const timer = window.setInterval(() => setRemaining(getCooldownRemaining(sentAt)), 1000);
    return () => window.clearInterval(timer);
  }, [sentAt]);

  useEffect(() => {
    if (sentAt) setRemaining(getCooldownRemaining(sentAt));
  }, [sentAt]);

  function updateRegistration(field: keyof Registration, value: string | boolean) {
    setRegistration((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');

    if (!supabase) {
      setError('Authentication is not configured. Add Supabase variables first.');
      setBusy(false);
      return;
    }

    try {
      if (recovery) {
        if (mode !== 'email') throw new Error('Password recovery is currently available by email only.');
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(identifier, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (recoveryError) throw recoveryError;
        setStatus('Recovery email request accepted. Check your inbox if the address exists.');
      } else if (isRegistering) {
        validateRegistration(password, registration);
        const options = {
          data: {
            display_name: registration.fullName.trim(),
            mobile_number: registration.mobile.trim(),
            date_of_birth: registration.dateOfBirth,
          },
        };

        if (mode === 'email') {
          const result = await supabase.auth.signUp({ email: identifier.trim(), password, options });
          if (result.error) throw result.error;
          setStatus(result.data.session ? 'Account created. Redirecting…' : 'Account created. Check your email to verify your address.');
          if (result.data.session) {
            router.replace('/');
            router.refresh();
          }
        } else {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            phone: identifier.trim(),
            options: { shouldCreateUser: true, data: options.data },
          });
          if (otpError) throw otpError;
          const now = Date.now();
          setSentAt(now);
          setRemaining(60);
          setStatus('OTP request accepted by Supabase. Enter the code only after it arrives.');
        }
      } else if (mode === 'email' || usePassword) {
        if (!password) throw new Error('Enter a password.');
        const result = await supabase.auth.signInWithPassword({ email: identifier.trim(), password });
        if (result.error) throw result.error;
        router.replace('/');
        router.refresh();
      } else if (!sentAt) {
        const { error: otpError } = await supabase.auth.signInWithOtp({ phone: identifier.trim() });
        if (otpError) throw otpError;
        const now = Date.now();
        setSentAt(now);
        setRemaining(60);
        setStatus('OTP request accepted by Supabase. Enter the code only after it arrives.');
      } else {
        const { error: verifyError } = await supabase.auth.verifyOtp({ phone: identifier.trim(), token: otp, type: 'sms' });
        if (verifyError) throw verifyError;
        router.replace('/');
        router.refresh();
      }
    } catch (authError) {
      setError(normalizeAuthError(authError));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setSentAt(null);
    setOtp('');
    setError('');
    setStatus('');
    setUsePassword(next === 'email');
  }

  function toggleRegistration() {
    setIsRegistering((value) => !value);
    setRecovery(false);
    setError('');
    setStatus('');
    setPassword('');
    setRegistration(emptyRegistration);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-mark">✦</div>
        <p className="eyebrow">COMMUNITYHUB</p>
        <h1>{title}</h1>
        <p className="muted">Use a verified identity to keep the community safe.</p>

        <div className="auth-tabs">
          <button className={mode === 'email' ? 'selected' : ''} onClick={() => switchMode('email')}>Email</button>
          <button className={mode === 'phone' ? 'selected' : ''} onClick={() => switchMode('phone')}>Phone / SMS</button>
        </div>

        <form onSubmit={submit}>
          {isRegistering && !recovery && (
            <>
              <label htmlFor="full-name">FULL NAME</label>
              <input id="full-name" required value={registration.fullName} onChange={(event) => updateRegistration('fullName', event.target.value)} placeholder="Your name" autoComplete="name" />
              <div className="auth-two-fields">
                <div>
                  <label htmlFor="mobile-number">MOBILE NUMBER</label>
                  <input id="mobile-number" required type="tel" value={registration.mobile} onChange={(event) => updateRegistration('mobile', event.target.value)} placeholder="+44 7700 900000" autoComplete="tel" />
                </div>
                <div>
                  <label htmlFor="date-of-birth">DATE OF BIRTH</label>
                  <input id="date-of-birth" required type="date" value={registration.dateOfBirth} onChange={(event) => updateRegistration('dateOfBirth', event.target.value)} autoComplete="bday" />
                </div>
              </div>
            </>
          )}

          <label htmlFor="identifier">{mode === 'email' ? 'EMAIL ADDRESS' : 'PHONE NUMBER'}</label>
          <input id="identifier" required type={mode === 'email' ? 'email' : 'tel'} value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={mode === 'email' ? 'you@example.com' : '+44 7700 900000'} autoComplete={mode === 'email' ? 'email' : 'tel'} />

          {!recovery && (mode === 'email' || usePassword || isRegistering) && (
            <>
              <label htmlFor="password">PASSWORD {mode === 'phone' && !isRegistering && <button type="button" className="inline-control" onClick={() => setUsePassword(!usePassword)}>{usePassword ? 'Use SMS code instead' : 'Use password instead'}</button>}</label>
              <input id="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} autoComplete={isRegistering ? 'new-password' : 'current-password'} />
            </>
          )}

          {isRegistering && !recovery && (
            <>
              <label htmlFor="confirm-password">CONFIRM PASSWORD</label>
              <input id="confirm-password" type="password" required value={registration.confirmPassword} onChange={(event) => updateRegistration('confirmPassword', event.target.value)} placeholder="Enter password again" minLength={8} autoComplete="new-password" />
              <label className="terms-check"><input type="checkbox" checked={registration.termsAccepted} onChange={(event) => updateRegistration('termsAccepted', event.target.checked)} /> <span>I agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</span></label>
            </>
          )}

          {mode === 'phone' && !usePassword && !isRegistering && sentAt && (
            <>
              <label htmlFor="otp">SMS CODE <span className="cooldown">{remaining ? `Resend in ${remaining}s` : 'You can resend'}</span></label>
              <input id="otp" inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="123456" />
              <button type="button" className="secondary-action" disabled={resendDisabled} onClick={() => { setSentAt(null); setOtp(''); }}>Resend code</button>
            </>
          )}

          <button className="primary-action" disabled={busy}>{busy ? 'Working…' : recovery ? 'Send recovery email' : sentAt && mode === 'phone' && !usePassword ? 'Verify code' : isRegistering ? 'Create account' : 'Sign in'}</button>
        </form>

        {error && <p className="error">{error}</p>}
        {status && <p className="status">{status}</p>}
        <div className="auth-footer">
          <button onClick={() => { setRecovery(!recovery); setError(''); setStatus(''); }}>{recovery ? 'Back to sign in' : 'Forgot password?'}</button>
          <button onClick={toggleRegistration}>{isRegistering ? 'Already have an account?' : 'Create an account'}</button>
        </div>
      </section>
    </main>
  );
}

function validateRegistration(passwordValue: string, registration: Registration) {
  if (passwordValue.length < 8) throw new Error('Password must be at least 8 characters.');
  if (passwordValue !== registration.confirmPassword) throw new Error('Passwords do not match.');
  if (!registration.termsAccepted) throw new Error('Accept the Terms of Service and Privacy Policy to continue.');
  const birthDate = new Date(`${registration.dateOfBirth}T00:00:00`);
  const minimumDate = new Date();
  minimumDate.setFullYear(minimumDate.getFullYear() - 13);
  if (!registration.dateOfBirth || Number.isNaN(birthDate.getTime()) || birthDate > minimumDate) throw new Error('You must be at least 13 years old to create an account.');
}

function normalizeAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Authentication failed.';
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'Cannot reach Supabase. Check apps/web/.env.local for the real project URL and publishable key, then restart the web server.';
  if (/rate limit|too many|429/i.test(message)) return 'Too many attempts. Wait a little before trying again.';
  if (/expired|invalid.*token|otp/i.test(message)) return 'That code is invalid or expired. Request a new code and try again.';
  if (/already registered|already exists|user already/i.test(message)) return 'An account with this identity already exists. Try signing in instead.';
  if (/invalid login credentials/i.test(message)) return 'The credentials do not match an account.';
  if (/provider|sms|phone/i.test(message)) return 'SMS delivery is not configured or the provider rejected this request.';
  return message;
}
