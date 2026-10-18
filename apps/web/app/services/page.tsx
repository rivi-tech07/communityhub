'use client';
import { useEffect, useState } from 'react';
export default function ServicesPage() {
  const [items, setItems] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      description: string;
      pricing: string | null;
    }>
  >([]);
  useEffect(() => {
    fetch('/api/services')
      .then((response) => response.json())
      .then((body) => setItems(body.services ?? []));
  }, []);
  return (
    <main className="directory-page">
      <header className="directory-header">
        <div>
          <p className="eyebrow">COMMUNITYHUB / SERVICES</p>
          <h1>Local services</h1>
          <p className="muted">
            Discover published providers and send an enquiry when you are signed in.
          </p>
        </div>
        <a className="back-link" href="/">
          Dashboard
        </a>
      </header>
      <section className="business-grid">
        {items.map((item) => (
          <article className="business-card" key={item.id}>
            <span className="business-category">{item.category}</span>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <small>{item.pricing ?? 'Pricing available on enquiry'}</small>
          </article>
        ))}
        {items.length === 0 && <p className="empty-state">No published services yet.</p>}
      </section>
    </main>
  );
}
