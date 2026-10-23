'use client';

import { useEffect, useState, type ReactNode } from 'react';

type Job = { id: string; title: string; location: string | null; job_type: string; salary_currency: string };
type Business = { id: string; name: string; category: string; city: string | null; country: string | null; is_sample: boolean };
type Service = { id: string; name: string; category: string; pricing: string | null; service_areas: string[]; is_sample: boolean };
type Event = { id: string; title: string; starts_at: string; venue_name: string | null; online_url: string | null; is_sample: boolean };
type Community = { id: string; name: string; community_type: string; visibility: string; city: string | null; is_sample: boolean };
type DashboardData = { jobs: Job[]; businesses: Business[]; services: Service[]; events: Event[]; communities: Community[] };

const emptyData: DashboardData = { jobs: [], businesses: [], services: [], events: [], communities: [] };

async function loadList<T>(url: string, key: keyof DashboardData): Promise<T[]> {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `Unable to load ${key}.`);
  return Array.isArray(payload?.[key]) ? payload[key] as T[] : [];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function loadDashboard(search = '') {
    setLoading(true);
    setError('');
    try {
      const suffix = search ? `?query=${encodeURIComponent(search)}` : '';
      const [jobs, businesses, services, events, communities] = await Promise.all([
        loadList<Job>(`/api/jobs${suffix}`, 'jobs'),
        loadList<Business>(`/api/businesses${suffix}`, 'businesses'),
        loadList<Service>(`/api/services${suffix}`, 'services'),
        loadList<Event>(`/api/events${suffix}`, 'events'),
        loadList<Community>(`/api/communities?public=true${search ? `&query=${encodeURIComponent(search)}` : ''}`, 'communities').catch(() => []),
      ]);
      setData({ jobs, businesses, services, events, communities });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load CommunityHub.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  return (
    <main className="community-web-shell">
      <header className="community-web-header"><a href="/" className="community-web-brand"><span className="brand-mark">✦</span>Community<span>Hub</span></a><nav className="community-web-actions"><a href="/community">Communities</a><a href="/jobs">Jobs</a><a href="/businesses">Shop</a><a href="/login" className="web-sign-in">Sign in</a></nav></header>
      <section className="community-web-content">
        <div className="community-welcome"><div><p className="eyebrow">COMMUNITYHUB / DISCOVER</p><h1>Find people, opportunities and local places.</h1><p className="muted">Search verified listings and public communities. Sign in to see your private feed.</p></div><span className="web-status"><span />Live directory</span></div>
        <form className="home-search" onSubmit={(event) => { event.preventDefault(); void loadDashboard(query.trim()); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs, businesses, services, events or communities" aria-label="Search CommunityHub" /><button className="primary-action" type="submit">Search</button></form>
        <div className="home-quick-actions"><a href="/community">Explore communities</a><a href="/jobs">Find a job</a><a href="/services">Find a service</a><a href="/events">Discover events</a></div>
        {error && <div className="error-state"><strong>We could not load the directory.</strong><p>{error}</p><button className="secondary-action" type="button" onClick={() => void loadDashboard(query.trim())}>Try again</button></div>}
        {loading ? <div className="loading-state">Loading local listings…</div> : <>
          <LiveSection title="Public communities" href="/community" empty="No public communities are available yet.">{data.communities.map((community) => <a className="live-card" href={`/community?community=${community.id}`} key={community.id}><span className="live-card-label">{community.community_type}</span><strong>{community.name}</strong><small>{community.city ?? 'UK-wide'} · {community.visibility}</small>{community.is_sample && <em>Sample</em>}</a>)}</LiveSection>
          <LiveSection title="Jobs near you" href="/jobs" empty="No published jobs match your search.">{data.jobs.map((job) => <a className="live-card" href={`/jobs?job=${job.id}`} key={job.id}><span className="live-card-label">{job.job_type.replaceAll('_', ' ')}</span><strong>{job.title}</strong><small>{job.location ?? 'Location not supplied'} · {job.salary_currency}</small></a>)}</LiveSection>
          <LiveSection title="Local businesses" href="/businesses" empty="No verified businesses are available yet.">{data.businesses.map((business) => <a className="live-card" href={`/businesses/${business.id}`} key={business.id}><span className="live-card-label">{business.category}</span><strong>{business.name}</strong><small>{business.city ?? business.country ?? 'Location not supplied'}</small>{business.is_sample && <em>Sample</em>}</a>)}</LiveSection>
          <LiveSection title="Services" href="/services" empty="No published services match your search.">{data.services.map((service) => <a className="live-card" href={`/services?service=${service.id}`} key={service.id}><span className="live-card-label">{service.category}</span><strong>{service.name}</strong><small>{service.pricing ?? 'Pricing supplied by provider'} · {service.service_areas.join(', ') || 'Local area'}</small>{service.is_sample && <em>Sample</em>}</a>)}</LiveSection>
          <LiveSection title="Upcoming events" href="/events" empty="No upcoming events are published yet.">{data.events.map((event) => <a className="live-card" href={`/events?event=${event.id}`} key={event.id}><span className="live-card-label">{new Date(event.starts_at).toLocaleDateString('en-GB')}</span><strong>{event.title}</strong><small>{event.online_url ? 'Online event' : event.venue_name ?? 'Venue to be announced'}</small>{event.is_sample && <em>Sample</em>}</a>)}</LiveSection>
          <section className="home-private-feed"><div><h2>Your community feed</h2><p>Posts, photos, videos, comments and saved content are available after sign-in and membership checks.</p></div><a className="primary-action" href="/login">Sign in to view feed</a></section>
        </>}
      </section>
      <nav className="web-bottom-nav"><a className="selected" href="/">⌂<span>Home</span></a><a href="/community">＋<span>Community</span></a><a href="/jobs">▣<span>Jobs</span></a><a href="/businesses">🛒<span>Shop</span></a><a href="/profile">○<span>Profile</span></a></nav>
    </main>
  );
}

function LiveSection({ title, href, empty, children }: { title: string; href: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="live-section"><div className="live-section-heading"><h2>{title}</h2><a href={href}>View all ›</a></div>{hasChildren ? <div className="live-grid">{children}</div> : <div className="empty-state"><p>{empty}</p></div>}</section>;
}
