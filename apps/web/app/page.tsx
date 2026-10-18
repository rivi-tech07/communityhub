import { supabaseConfig } from '../lib/supabase';

const cards = [
  ['Members', '0', 'Connect Supabase to load members'],
  ['Jobs', '0', 'Search published opportunities'],
  ['Services', '0', 'Find local service providers'],
  ['Events', '0', 'Discover upcoming community events'],
];

export default function DashboardPage() {
  return (
    <main className="dashboard">
      <aside className="web-sidebar">
        <div className="web-brand">
          <span>✦</span> CommunityHub
        </div>
        <p className="eyebrow">ADMIN CONSOLE</p>
        <nav>
          <a className="active" href="#overview">
            Overview
          </a>
          <a href="/community">Communities</a>
          <a href="/businesses">Business directory</a>
          <a href="/business/dashboard">Business dashboard</a>
          <a href="/jobs">Jobs</a>
          <a href="/services">Services</a>
          <a href="/events">Events</a>
          <a href="#reports">Reports</a>
        </nav>
        <div className="sidebar-note">
          <strong>Phase 5</strong>
          <p>
            Jobs, sponsorship labels, services, and events are available. Checkout stays disabled.
          </p>
        </div>
      </aside>
      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">COMMUNITYHUB / OVERVIEW</p>
            <h1>Good morning, admin</h1>
            <p className="muted">Explore the community’s opportunity and local discovery layer.</p>
          </div>
          <div className="status-pill">
            <span /> {supabaseConfig ? 'Supabase configured' : 'Development mode'}
          </div>
        </header>
        <section className="metric-grid">
          {cards.map(([label, value, note]) => (
            <article className="metric" key={label}>
              <span className="muted">{label}</span>
              <strong>{value}</strong>
              <small>{note}</small>
            </article>
          ))}
        </section>
        <section className="admin-panel">
          <div>
            <p className="eyebrow">SYSTEM STATUS</p>
            <h2>Phase 5 foundation ready</h2>
            <p className="muted">
              Authentication, profiles, communities, moderation, business catalogs, jobs,
              sponsorship evidence fields, services, events, protected documents, and
              access-controlled requests are wired for local development.
            </p>
          </div>
          <div className="check-list">
            <div>✓ Jobs and applications</div>
            <div>✓ Sponsorship evidence labels</div>
            <div>✓ Local services and enquiries</div>
            <div>✓ Events and capacity rules</div>
          </div>
        </section>
      </section>
    </main>
  );
}
