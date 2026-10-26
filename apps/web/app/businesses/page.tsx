'use client';

import { useEffect, useMemo, useState } from 'react';

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
  const [category, setCategory] = useState('All');
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('Loading directory…');
  const categories = ['All', 'Grocery', 'Fruits & vegetables', 'Dairy & eggs', 'Household'];
  const basketCount = useMemo(() => Object.values(basket).reduce((sum, count) => sum + count, 0), [basket]);
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
          <a href="/">Home</a>
        </div>
      </header>
      <section className="shop-location-bar" aria-label="Delivery location">
        <div><span className="shop-location-label">DELIVER TO</span><strong>Set your postcode</strong></div>
        <span className="shop-eta">Nearest shops first · ETA shown per item</span>
      </section>
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
      <div className="shop-categories" aria-label="Shop categories">
        {categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}
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
      {products.length > 0 && <section className="shop-results"><div className="directory-section-heading"><div><p className="eyebrow">ITEMS NEARBY</p><h2>{query ? `Results for “${query}”` : 'Popular items'}</h2></div><span className="muted">Choose items first; we’ll group them by shop.</span></div><div className="product-grid">{products.map((product) => { const delivery = product.delivery_configs; const count = basket[product.id] ?? 0; return <article className="product-card shop-product-card" key={product.id}><div className="product-image-placeholder" aria-hidden="true">{product.name.slice(0, 1).toUpperCase()}</div><span className="product-unit">{product.unit}</span><h3>{product.name}</h3><p>{product.description ?? 'Available from a verified local shop.'}</p><strong>{product.currency} {Number(product.price).toFixed(2)}</strong><small>{product.businesses?.name ?? 'Local shop'} · {product.businesses?.city ?? product.businesses?.country ?? 'Nearby'}</small>{delivery && <span className="delivery-estimate">{delivery.estimated_min_minutes}–{delivery.estimated_max_minutes} min delivery</span>}<button className="secondary-action" onClick={() => setBasket((current) => ({ ...current, [product.id]: count + 1 }))}>{count ? `Added · ${count}` : 'Add to basket'}</button></article>; })}</div></section>}
      {!message && !businesses.length && !products.length && (
        <div className="empty-state">
          <strong>No verified shops or items found</strong>
          <p>Try a different item or shop name.</p>
        </div>
      )}
      {basketCount > 0 && <aside className="shop-basket-bar" aria-label="Basket summary"><div><strong>{basketCount} item{basketCount === 1 ? '' : 's'} in basket</strong><span>Items will be grouped by shop before checkout.</span></div><button className="primary-action" disabled title="Checkout is not active yet">Checkout unavailable</button></aside>}
    </main>
  );
}
