'use client';

import { useEffect, useState } from 'react';

type Business = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  city: string | null;
  country: string | null;
  is_sample: boolean;
};
export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('Loading directory…');
  async function load() {
    const response = await fetch(
      `/api/businesses${query ? `?q=${encodeURIComponent(query)}` : ''}`,
    );
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? 'Unable to load directory.');
      return;
    }
    setBusinesses(payload.businesses ?? []);
    setMessage('');
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="directory-page">
      <header className="directory-header">
        <div>
          <p className="eyebrow">COMMUNITYHUB / LOCAL BUSINESS</p>
          <h1>Shop local</h1>
          <p className="muted">Discover verified businesses and their published catalogs.</p>
        </div>
        <div className="directory-links">
          <a href="/business/dashboard">Manage a business</a>
          <a href="/">Admin home</a>
        </div>
      </header>
      <div className="directory-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void load();
          }}
          placeholder="Search businesses"
        />
        <button className="primary-action" onClick={() => void load()}>
          Search
        </button>
      </div>
      {message && <p className="muted">{message}</p>}
      <section className="business-grid">
        {businesses.map((business) => (
          <a className="business-card" href={`/businesses/${business.id}`} key={business.id}>
            <span className="business-category">{business.category}</span>
            <h2>{business.name}</h2>
            <p>{business.description ?? 'Verified local business'}</p>
            <small>{business.city ?? business.country ?? 'Local'}</small>
            {business.is_sample && <span className="sample-badge">Sample</span>}
          </a>
        ))}
      </section>
      {!message && !businesses.length && (
        <div className="empty-state">
          <strong>No verified businesses found</strong>
          <p>Try a different search.</p>
        </div>
      )}
    </main>
  );
}
