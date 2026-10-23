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
type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  unit: string;
  stock_quantity: number;
  businesses?: { id: string; name: string; city: string | null; country: string | null } | null;
  delivery_configs?: { estimated_min_minutes: number; estimated_max_minutes: number } | null;
};
export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('Loading directory…');
  async function load() {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
    const [businessResponse, productResponse] = await Promise.all([
      fetch(`/api/businesses${suffix}`),
      fetch(`/api/products${suffix}`),
    ]);
    const businessPayload = await businessResponse.json();
    const productPayload = await productResponse.json();
    if (!businessResponse.ok || !productResponse.ok) {
      setMessage(businessPayload.error ?? productPayload.error ?? 'Unable to load shop.');
      return;
    }
    setBusinesses(businessPayload.businesses ?? []);
    setProducts(productPayload.products ?? []);
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
          placeholder="Search items or shops"
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
      {products.length > 0 && <section className="shop-results"><div className="directory-section-heading"><div><p className="eyebrow">ITEMS NEARBY</p><h2>{query ? `Results for “${query}”` : 'Popular items'}</h2></div><span className="muted">Delivery times are set by each shop</span></div><div className="product-grid">{products.map((product) => { const delivery = product.delivery_configs; return <article className="product-card shop-product-card" key={product.id}><span className="product-unit">{product.unit}</span><h3>{product.name}</h3><p>{product.description ?? 'Available from a verified local shop.'}</p><strong>{product.currency} {Number(product.price).toFixed(2)}</strong><small>{product.businesses?.name ?? 'Local shop'} · {product.businesses?.city ?? product.businesses?.country ?? 'Nearby'}</small>{delivery && <span className="delivery-estimate">{delivery.estimated_min_minutes}–{delivery.estimated_max_minutes} min delivery</span>}<a className="secondary-action" href={product.businesses ? `/businesses/${product.businesses.id}` : '/businesses'}>View shop</a></article>; })}</div></section>}
      {!message && !businesses.length && !products.length && (
        <div className="empty-state">
          <strong>No verified shops or items found</strong>
          <p>Try a different item or shop name.</p>
        </div>
      )}
    </main>
  );
}
