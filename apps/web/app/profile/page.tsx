'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

type Profile = { display_name: string; biography: string; country: string; city: string; preferred_language: string; profile_photo_url: string };
type Theme = 'system' | 'light' | 'dark';
type Accent = 'orange' | 'mint' | 'blue' | 'purple';
const emptyProfile: Profile = { display_name: '', biography: '', country: '', city: '', preferred_language: 'en', profile_photo_url: '' };

function applyAppearance(theme: Theme, accent: Accent) {
  const root = document.documentElement;
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.dataset.theme = theme === 'system' ? preferred : theme;
  root.dataset.accent = accent;
  window.localStorage.setItem('communityhub-theme', theme);
  window.localStorage.setItem('communityhub-accent', accent);
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Loading profile…');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [accent, setAccent] = useState<Accent>('orange');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('communityhub-theme') as Theme | null;
    const storedAccent = window.localStorage.getItem('communityhub-accent') as Accent | null;
    const nextTheme = storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'system';
    const nextAccent = storedAccent === 'orange' || storedAccent === 'mint' || storedAccent === 'blue' || storedAccent === 'purple' ? storedAccent : 'orange';
    setTheme(nextTheme); setAccent(nextAccent); applyAppearance(nextTheme, nextAccent);
  }, []);

  useEffect(() => {
    async function load() {
      if (!supabase) { setMessage('Supabase is not configured.'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      setEmail(session.user.email ?? session.user.phone ?? ''); setPhone(session.user.phone ?? 'Not added');
      const { data, error } = await supabase.from('profiles').select('display_name, biography, country, city, preferred_language, profile_photo_url').eq('id', session.user.id).maybeSingle();
      if (error) { setMessage(error.message); return; }
      setProfile({ ...emptyProfile, ...(data ?? {}) }); setMessage('');
    }
    void load();
  }, [router]);

  function update(field: keyof Profile, value: string) { setSaved(false); setProfile({ ...profile, [field]: value }); }
  async function save() {
    if (!supabase) return;
    setBusy(true); setSaved(false); setMessage('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    const { error } = await supabase.from('profiles').update(profile).eq('id', user.id);
    setSaved(!error); setMessage(error ? error.message : 'Profile saved just now.'); setBusy(false);
    if (!error) setEditing(false);
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !supabase) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { setMessage('Choose a JPG, PNG, or WebP image under 2 MB.'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    setBusy(true); setMessage('Uploading photo…');
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from('profile-media').upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setMessage('Photo upload is not available yet.'); setBusy(false); return; }
    const { data } = supabase.storage.from('profile-media').getPublicUrl(path);
    const { error } = await supabase.from('profiles').update({ profile_photo_url: data.publicUrl }).eq('id', user.id);
    if (error) setMessage('Photo uploaded, but profile update failed.');
    else { setProfile((current) => ({ ...current, profile_photo_url: data.publicUrl })); setMessage('Profile photo updated.'); setSaved(true); }
    setBusy(false);
  }

  async function removePhoto() {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setBusy(true);
    await supabase.storage.from('profile-media').remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.jpeg`, `${user.id}/avatar.png`, `${user.id}/avatar.webp`]);
    const { error } = await supabase.from('profiles').update({ profile_photo_url: null }).eq('id', user.id);
    setMessage(error ? error.message : 'Profile photo removed.');
    if (!error) setProfile((current) => ({ ...current, profile_photo_url: '' }));
    setBusy(false);
  }

  async function signOut() { await supabase?.auth.signOut(); router.replace('/login'); }
  const initials = (profile.display_name || email || 'Y').slice(0, 1).toUpperCase();
  const avatar = profile.profile_photo_url ? <img src={profile.profile_photo_url} alt="Profile" /> : initials;

  return <main className="profile-web-shell"><header className="community-web-header"><a href="/" className="community-web-brand"><span className="brand-mark">✦</span>Community<span>Hub</span></a><nav className="community-web-actions"><a href="/">Home</a><a href="/businesses">Shop</a><a href="/jobs">Jobs</a><a href="/settings">Settings</a><button type="button" className="web-sign-in" onClick={() => void signOut()}>Sign out</button></nav></header><section className="profile-web-page"><div className="profile-web-heading"><div><p className="eyebrow">COMMUNITYHUB / PROFILE</p><h1>Your profile</h1><p className="muted">Your identity, community details and personal appearance in one place.</p></div><div className="profile-heading-side"><div className="profile-web-avatar">{avatar}</div><a className="profile-settings-link" href="/settings">Settings and activity →</a></div></div><section className="profile-web-card profile-overview"><div className="profile-overview-header"><div><p className="eyebrow">PROFILE OVERVIEW</p><h2>{profile.display_name || 'Your name'}</h2><p className="muted">Your community identity at a glance.</p></div><span className="profile-overview-check">✓ Saved details</span></div><div className="profile-photo-controls"><div className="profile-photo-preview">{avatar}</div><div><strong>Profile picture</strong><small>Use a square JPG, PNG, or WebP up to 2 MB.</small><div className="profile-photo-actions"><button type="button" className="secondary-action" onClick={() => fileInput.current?.click()} disabled={busy}>Change photo</button>{profile.profile_photo_url && <button type="button" className="text-action" onClick={() => void removePhoto()} disabled={busy}>Remove</button>}<input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadPhoto(event)} /></div></div></div><div className="profile-overview-grid"><div><span>Email address</span><strong>{email || 'Not added'}</strong></div><div><span>Phone number</span><strong>{phone || 'Not added'}</strong></div><div><span>City</span><strong>{profile.city || 'Not added'}</strong></div><div><span>Country</span><strong>{profile.country || 'Not added'}</strong></div><div><span>Preferred language</span><strong>{profile.preferred_language || 'Not added'}</strong></div><div><span>About you</span><strong>{profile.biography || 'Add a short biography'}</strong></div></div></section><section className="profile-web-card profile-appearance"><div><p className="eyebrow">APPEARANCE</p><h2>Make CommunityHub yours</h2><p className="muted">Your choice is saved on this device and works on mobile and desktop.</p></div><div className="appearance-row"><span>Color theme</span><div className="segmented-control">{(['system', 'light', 'dark'] as Theme[]).map((option) => <button key={option} type="button" className={theme === option ? 'selected' : ''} onClick={() => { setTheme(option); applyAppearance(option, accent); }}>{option[0].toUpperCase() + option.slice(1)}</button>)}</div></div><div className="appearance-row"><span>Accent color</span><div className="accent-options">{(['orange', 'mint', 'blue', 'purple'] as Accent[]).map((option) => <button key={option} type="button" aria-label={`Use ${option} accent`} className={`accent-swatch accent-${option} ${accent === option ? 'selected' : ''}`} onClick={() => { setAccent(option); applyAppearance(theme, option); }} />)}</div></div></section><section className="profile-web-card profile-edit-section"><div className="profile-edit-header"><div className="profile-web-account"><strong>Edit your profile</strong><small>Email and phone verification are managed by Supabase Auth.</small></div><button type="button" className="secondary-action profile-edit-button" onClick={() => setEditing(!editing)}>{editing ? 'Close editor' : 'Edit profile'}</button></div>{editing && <><div className="profile-web-form"><label>DISPLAY NAME<input value={profile.display_name} onChange={(event) => update('display_name', event.target.value)} placeholder="Your name" /></label><label>CITY<input value={profile.city} onChange={(event) => update('city', event.target.value)} placeholder="Your city" /></label><label>COUNTRY<input value={profile.country} onChange={(event) => update('country', event.target.value)} placeholder="United Kingdom" /></label><label>PREFERRED LANGUAGE<input value={profile.preferred_language} onChange={(event) => update('preferred_language', event.target.value)} placeholder="en" /></label><label className="profile-full">BIOGRAPHY<textarea value={profile.biography} onChange={(event) => update('biography', event.target.value)} placeholder="Tell your community a little about yourself" /></label></div><button type="button" className={`primary-action profile-save${saved ? ' profile-save-success' : ''}`} disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : saved ? 'Saved ✓' : 'Save profile'}</button></>}{message && <p className={`status ${saved ? 'status-success' : message === 'Loading profile…' ? '' : 'status-error'}`} aria-live="polite">{message}</p>}</section></section><nav className="web-bottom-nav"><a href="/">⌂<span>Home</span></a><a href="/community">＋<span>Post</span></a><a href="/jobs">▣<span>Jobs</span></a><a href="/businesses">🛒<span>Shop</span></a><a className="selected" href="/profile">○<span>Profile</span></a></nav></main>;
}
