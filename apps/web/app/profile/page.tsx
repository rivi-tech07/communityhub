'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

type Profile = { display_name: string; biography: string; country: string; city: string; preferred_language: string };
const emptyProfile: Profile = { display_name: '', biography: '', country: '', city: '', preferred_language: 'en' };

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('Loading profile…');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      if (!supabase) { setMessage('Supabase is not configured.'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      setEmail(session.user.email ?? session.user.phone ?? '');
      const { data, error } = await supabase.from('profiles').select('display_name, biography, country, city, preferred_language').eq('id', session.user.id).maybeSingle();
      if (error) { setMessage(error.message); return; }
      setProfile({ ...emptyProfile, ...(data ?? {}) });
      setMessage('');
    }
    void load();
  }, [router]);

  async function save() {
    if (!supabase) return;
    setBusy(true); setMessage('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    const { error } = await supabase.from('profiles').update(profile).eq('id', user.id);
    setMessage(error ? error.message : 'Profile saved.');
    setBusy(false);
  }

  async function signOut() { await supabase?.auth.signOut(); router.replace('/login'); }

  return <main className="profile-web-shell"><header className="community-web-header"><a href="/" className="community-web-brand"><span className="brand-mark">✦</span>Community<span>Hub</span></a><nav className="community-web-actions"><a href="/">Home</a><a href="/businesses">Shop</a><a href="/jobs">Jobs</a><a href="/settings">Settings</a><button type="button" className="web-sign-in" onClick={() => void signOut()}>Sign out</button></nav></header><section className="profile-web-page"><div className="profile-web-heading"><div><p className="eyebrow">COMMUNITYHUB / PROFILE</p><h1>Your profile</h1><p className="muted">Keep your identity and location details up to date for your community.</p></div><div><div className="profile-web-avatar">{(profile.display_name || email || 'Y').slice(0, 1).toUpperCase()}</div><a className="profile-settings-link" href="/settings">Settings and activity →</a></div></div><section className="profile-web-card"><div className="profile-web-account"><strong>{email || 'Signed-in account'}</strong><small>Verified account details are managed by Supabase Auth.</small></div><div className="profile-web-form"><label>DISPLAY NAME<input value={profile.display_name} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} placeholder="Your name" /></label><label>CITY<input value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} placeholder="Your city" /></label><label>COUNTRY<input value={profile.country} onChange={(event) => setProfile({ ...profile, country: event.target.value })} placeholder="United Kingdom" /></label><label>PREFERRED LANGUAGE<input value={profile.preferred_language} onChange={(event) => setProfile({ ...profile, preferred_language: event.target.value })} placeholder="en" /></label><label className="profile-full">BIOGRAPHY<textarea value={profile.biography} onChange={(event) => setProfile({ ...profile, biography: event.target.value })} placeholder="Tell your community a little about yourself" /></label></div><button type="button" className="primary-action profile-save" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save profile'}</button>{message && <p className="status">{message}</p>}</section></section><nav className="web-bottom-nav"><a href="/">⌂<span>Home</span></a><a href="/community">＋<span>Post</span></a><a href="/jobs">▣<span>Jobs</span></a><a href="/businesses">🛒<span>Shop</span></a><a className="selected" href="/profile">○<span>Profile</span></a></nav></main>;
}
