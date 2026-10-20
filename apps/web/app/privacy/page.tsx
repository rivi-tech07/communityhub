import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="community-web-shell">
      <div className="community-web-content">
        <Link className="back-link" href="/login">← Back to sign in</Link>
        <h1>Privacy Policy</h1>
        <p className="muted">This short development policy explains the information CommunityHub uses to provide the service.</p>
        <section className="profile-web-card">
          <h2>Information we use</h2>
          <p className="muted">We use your email or phone number for authentication, and profile details you provide to support your account and community features.</p>
          <h2>Security and sharing</h2>
          <p className="muted">Authentication data is handled by Supabase. Private documents and account data are protected by server authorization and are not made public without permission.</p>
          <h2>Your choices</h2>
          <p className="muted">You can update your profile or request account deletion from the application. Contact the CommunityHub administrator for privacy questions.</p>
        </section>
      </div>
    </main>
  );
}
