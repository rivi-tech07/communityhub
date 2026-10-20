import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="community-web-shell">
      <div className="community-web-content">
        <Link className="back-link" href="/login">← Back to sign in</Link>
        <h1>Terms of Service</h1>
        <p className="muted">CommunityHub is a community platform for local posts, jobs, services, businesses and grocery listings.</p>
        <section className="profile-web-card">
          <h2>Use of the service</h2>
          <p className="muted">You must provide accurate account details, keep your login secure, and use CommunityHub lawfully. Do not post abusive, fraudulent, unsafe or infringing content.</p>
          <h2>Listings and community content</h2>
          <p className="muted">Business, job, service, event and community information is supplied by users. Verify important details independently before relying on them.</p>
          <h2>Safety and enforcement</h2>
          <p className="muted">We may remove content, restrict accounts or cooperate with lawful requests when needed to protect users and the platform.</p>
        </section>
      </div>
    </main>
  );
}
