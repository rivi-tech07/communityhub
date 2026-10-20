'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

type Privacy = { profile_visible: boolean; show_city: boolean; allow_messages: boolean };
const defaultPrivacy: Privacy = { profile_visible: true, show_city: true, allow_messages: true };

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>(defaultPrivacy);
  const [openPanel, setOpenPanel] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Loading settings…');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      if (!supabase) { setError('Supabase is not configured.'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      setEmail(session.user.email ?? session.user.phone ?? 'Signed-in account');
      const { data } = await supabase.from('profiles').select('privacy_settings').eq('id', session.user.id).maybeSingle();
      setPrivacy({ ...defaultPrivacy, ...((data?.privacy_settings as Partial<Privacy> | null) ?? {}) });
      setMessage('');
    }
    void load();
  }, [router]);

  function togglePanel(panel: string) {
    setOpenPanel((current) => current === panel ? '' : panel);
    setError('');
    setMessage('');
  }

  async function savePrivacy() {
    if (!supabase) return;
    setBusy(true); setError(''); setMessage('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    const { error: saveError } = await supabase.from('profiles').update({ privacy_settings: privacy }).eq('id', user.id);
    if (saveError) setError(saveError.message); else setMessage('Privacy settings saved.');
    setBusy(false);
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
      if (newPassword !== confirmPassword) throw new Error('New passwords do not match.');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      if (user.email) {
        if (!currentPassword) throw new Error('Enter your current password to continue.');
        const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (verifyError) throw new Error('Current password is incorrect.');
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setMessage('Password changed successfully.');
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Unable to change password.');
    } finally { setBusy(false); }
  }

  async function deleteAccount() {
    if (!supabase || !window.confirm('Delete your CommunityHub account permanently? This cannot be undone.')) return;
    setBusy(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      const response = await fetch('/api/account', { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error((await response.json()).error ?? 'Account deletion failed.');
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Account deletion failed.');
      setBusy(false);
    }
  }

  async function signOut() { await supabase?.auth.signOut(); router.replace('/login'); }

  const rows = [
    { section: 'Your account', items: [
      { id: 'password', icon: '◉', title: 'Password and security', subtitle: 'Change password and protect your account' },
      { id: 'account', icon: '◎', title: 'Personal details', subtitle: email },
    ] },
    { section: 'How you use CommunityHub', items: [
      { id: 'saved', icon: '☆', title: 'Saved posts', subtitle: 'Your saved community content' },
      { id: 'activity', icon: '◷', title: 'Your activity', subtitle: 'Posts, comments and applications' },
      { id: 'notifications', icon: '♧', title: 'Notifications', subtitle: 'Notification preferences' },
      { id: 'language', icon: '文', title: 'Language and translations', subtitle: 'English (UK)' },
    ] },
    { section: 'Who can see your content', items: [
      { id: 'privacy', icon: '▣', title: 'Account privacy', subtitle: privacy.profile_visible ? 'Public profile' : 'Private profile' },
      { id: 'blocked', icon: '⊘', title: 'Blocked accounts', subtitle: 'Manage people you have blocked' },
      { id: 'interactions', icon: '◌', title: 'Messages and comments', subtitle: privacy.allow_messages ? 'Allow messages' : 'Messages restricted' },
    ] },
    { section: 'Your app and support', items: [
      { id: 'accessibility', icon: '♿', title: 'Accessibility', subtitle: 'Display and interaction options' },
      { id: 'orders', icon: '▤', title: 'Orders and payments', subtitle: 'Orders, refunds and payment history' },
      { id: 'support', icon: '?', title: 'Help and legal information', subtitle: 'Terms, privacy and support' },
    ] },
  ];

  return <main className="settings-shell">
    <header className="settings-header"><button type="button" onClick={() => router.back()} aria-label="Go back">‹</button><h1>Settings and activity</h1><span /></header>
    <div className="settings-search">⌕ <span>Search settings</span></div>
    <section className="settings-content">
      {rows.map((group) => <section className="settings-group" key={group.section}><h2>{group.section}</h2>{group.items.map((item) => <div key={item.id} className="settings-item-wrap"><button type="button" className="settings-item" onClick={() => togglePanel(item.id)}><span className="settings-icon">{item.icon}</span><span className="settings-item-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span><span className="settings-chevron">›</span></button>
        {openPanel === item.id && <SettingsPanel id={item.id} privacy={privacy} setPrivacy={setPrivacy} onSavePrivacy={() => void savePrivacy()} onChangePassword={(event) => void changePassword(event)} currentPassword={currentPassword} setCurrentPassword={setCurrentPassword} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} busy={busy} onDelete={() => void deleteAccount()} />}
      </div>)}</section>)}
      {error && <p className="error settings-message">{error}</p>}{message && <p className="status settings-message">{message}</p>}
      <button type="button" className="settings-signout" onClick={() => void signOut()}>Log out</button>
      <button type="button" className="settings-delete" disabled={busy} onClick={() => void deleteAccount()}>Delete account</button>
    </section>
    <nav className="web-bottom-nav"><a href="/">⌂<span>Home</span></a><a href="/community">＋<span>Post</span></a><a href="/jobs">▣<span>Jobs</span></a><a href="/businesses">🛒<span>Shop</span></a><a className="selected" href="/profile">○<span>Profile</span></a></nav>
  </main>;
}

function SettingsPanel(props: { id: string; privacy: Privacy; setPrivacy: (value: Privacy) => void; onSavePrivacy: () => void; onChangePassword: (event: FormEvent) => void; currentPassword: string; setCurrentPassword: (value: string) => void; newPassword: string; setNewPassword: (value: string) => void; confirmPassword: string; setConfirmPassword: (value: string) => void; busy: boolean; onDelete: () => void }) {
  const [notifications, setNotifications] = useState({ comments: true, messages: true, jobs: true });
  const [language, setLanguage] = useState('en-GB');
  const [accessibility, setAccessibility] = useState({ reduceMotion: false, largerText: false });

  useEffect(() => {
    try {
      const savedNotifications = window.localStorage.getItem('communityhub-notifications');
      const savedLanguage = window.localStorage.getItem('communityhub-language');
      const savedAccessibility = window.localStorage.getItem('communityhub-accessibility');
      if (savedNotifications) setNotifications(JSON.parse(savedNotifications) as typeof notifications);
      if (savedLanguage) setLanguage(savedLanguage);
      if (savedAccessibility) {
        const savedValue = JSON.parse(savedAccessibility) as typeof accessibility;
        setAccessibility(savedValue);
        document.documentElement.dataset.reduceMotion = String(savedValue.reduceMotion);
        document.documentElement.dataset.largerText = String(savedValue.largerText);
      }
    } catch { return; }
  }, []);

  function saveNotifications(value: typeof notifications) {
    setNotifications(value);
    window.localStorage.setItem('communityhub-notifications', JSON.stringify(value));
  }

  function saveAccessibility(value: typeof accessibility) {
    setAccessibility(value);
    window.localStorage.setItem('communityhub-accessibility', JSON.stringify(value));
    document.documentElement.dataset.reduceMotion = String(value.reduceMotion);
    document.documentElement.dataset.largerText = String(value.largerText);
  }

  if (props.id === 'password') return <form className="settings-panel settings-form" onSubmit={props.onChangePassword}><p>Use a unique password with at least 8 characters.</p><label>Current password<input type="password" value={props.currentPassword} onChange={(event) => props.setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label>New password<input type="password" required minLength={8} value={props.newPassword} onChange={(event) => props.setNewPassword(event.target.value)} autoComplete="new-password" /></label><label>Confirm new password<input type="password" required minLength={8} value={props.confirmPassword} onChange={(event) => props.setConfirmPassword(event.target.value)} autoComplete="new-password" /></label><button className="primary-action" disabled={props.busy}>{props.busy ? 'Saving…' : 'Change password'}</button></form>;
  if (props.id === 'privacy') return <div className="settings-panel"><SettingToggle label="Public profile" description="Let authenticated community members find your profile." checked={props.privacy.profile_visible} onChange={(checked) => props.setPrivacy({ ...props.privacy, profile_visible: checked })} /><SettingToggle label="Show my city" description="Display your city on your public profile." checked={props.privacy.show_city} onChange={(checked) => props.setPrivacy({ ...props.privacy, show_city: checked })} /><SettingToggle label="Allow messages" description="Allow other members to contact you." checked={props.privacy.allow_messages} onChange={(checked) => props.setPrivacy({ ...props.privacy, allow_messages: checked })} /><button className="primary-action" type="button" disabled={props.busy} onClick={props.onSavePrivacy}>Save privacy</button></div>;
  if (props.id === 'support') return <div className="settings-panel settings-links"><a href="/privacy">Privacy policy <span>›</span></a><a href="/terms">Terms of service <span>›</span></a><p>For account support, contact the CommunityHub administrator.</p></div>;
  if (props.id === 'account') return <div className="settings-panel"><p>Your verified login identity is managed securely by Supabase Auth. Edit your profile details from the profile page.</p><a className="back-link" href="/profile">Open profile editor →</a></div>;
  if (props.id === 'notifications') return <div className="settings-panel"><SettingToggle label="Comments and replies" description="Notify me when someone replies to my post." checked={notifications.comments} onChange={(checked) => saveNotifications({ ...notifications, comments: checked })} /><SettingToggle label="Messages" description="Notify me about new community messages." checked={notifications.messages} onChange={(checked) => saveNotifications({ ...notifications, messages: checked })} /><SettingToggle label="Jobs and applications" description="Notify me about application updates." checked={notifications.jobs} onChange={(checked) => saveNotifications({ ...notifications, jobs: checked })} /><p className="settings-note">Preferences are saved on this device. Push delivery requires notification permission.</p></div>;
  if (props.id === 'language') return <div className="settings-panel settings-form"><label>APP LANGUAGE<select value={language} onChange={(event) => { setLanguage(event.target.value); window.localStorage.setItem('communityhub-language', event.target.value); }}><option value="en-GB">English (UK)</option><option value="gu">ગુજરાતી</option><option value="bn">বাংলা</option><option value="hi">हिन्दी</option></select></label><p className="settings-note">Your selection is saved for this browser. Translated content remains in its original language.</p></div>;
  if (props.id === 'accessibility') return <div className="settings-panel"><SettingToggle label="Reduce motion" description="Use fewer animated transitions." checked={accessibility.reduceMotion} onChange={(checked) => saveAccessibility({ ...accessibility, reduceMotion: checked })} /><SettingToggle label="Larger text" description="Increase readable interface text." checked={accessibility.largerText} onChange={(checked) => saveAccessibility({ ...accessibility, largerText: checked })} /></div>;
  if (props.id === 'saved') return <div className="settings-panel settings-links"><p>Your saved posts are protected by your account permissions.</p><a href="/community">Open community feed <span>›</span></a></div>;
  if (props.id === 'activity') return <div className="settings-panel settings-links"><a href="/community">Community posts and comments <span>›</span></a><a href="/jobs">Jobs and applications <span>›</span></a><a href="/profile">Profile changes <span>›</span></a></div>;
  if (props.id === 'blocked') return <div className="settings-panel settings-links"><p>Blocked users cannot interact with you. Use the block control on a community member or post.</p><a href="/community">Open community feed <span>›</span></a></div>;
  if (props.id === 'orders') return <div className="settings-panel settings-links"><p>Payment checkout is not active yet. No order or payment is created from this page.</p><a href="/businesses">Browse businesses <span>›</span></a></div>;
  if (props.id === 'interactions') return <div className="settings-panel"><SettingToggle label="Allow messages" description="This setting is controlled in Account privacy." checked={props.privacy.allow_messages} onChange={(checked) => props.setPrivacy({ ...props.privacy, allow_messages: checked })} /><p className="settings-note">Save this setting from Account privacy.</p></div>;
  return <div className="settings-panel settings-links"><a href="/privacy">Privacy policy <span>›</span></a><a href="/terms">Terms of service <span>›</span></a></div>;
}

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="settings-toggle"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}
