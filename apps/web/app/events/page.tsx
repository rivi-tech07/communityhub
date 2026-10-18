'use client';
import { useEffect, useState } from 'react';
export default function EventsPage() {
  const [items, setItems] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      starts_at: string;
      ends_at: string;
      venue_name: string | null;
      online_url: string | null;
      capacity: number | null;
    }>
  >([]);
  useEffect(() => {
    fetch('/api/events')
      .then((response) => response.json())
      .then((body) => setItems(body.events ?? []));
  }, []);
  return (
    <main className="directory-page">
      <header className="directory-header">
        <div>
          <p className="eyebrow">COMMUNITYHUB / EVENTS</p>
          <h1>What’s happening nearby</h1>
          <p className="muted">
            Free registration is available for signed-in users while capacity remains.
          </p>
        </div>
        <a className="back-link" href="/">
          Dashboard
        </a>
      </header>
      <section className="business-grid">
        {items.map((item) => (
          <article className="business-card" key={item.id}>
            <span className="business-category">Free event</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <small>
              {new Date(item.starts_at).toLocaleString()} · {item.venue_name ?? 'Online'}
            </small>
            <small>{item.capacity ? `Capacity ${item.capacity}` : 'No stated capacity'}</small>
          </article>
        ))}
        {items.length === 0 && <p className="empty-state">No upcoming published events yet.</p>}
      </section>
    </main>
  );
}
