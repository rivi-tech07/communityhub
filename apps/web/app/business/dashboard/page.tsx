'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createSupabaseClient, getSupabaseConfig } from '@communityhub/shared';
type Business = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  is_published: boolean;
  verification_status: string;
};
type Product = {
  id: string;
  name: string;
  price: number;
  currency: string;
  unit: string;
  stock_quantity: number;
  availability: boolean;
};
const config = getSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
const supabase = config ? createSupabaseClient(config) : null;
export default function BusinessDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [message, setMessage] = useState('');
  async function call(path: string, init?: RequestInit) {
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) throw new Error('Sign in before managing a business.');
    const response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? 'Request failed.');
    return payload;
  }
  async function load() {
    try {
      const payload = await call('/api/businesses/mine');
      setBusinesses(payload.businesses ?? []);
      if (payload.businesses?.[0]) await choose(payload.businesses[0]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load businesses.');
    }
  }
  async function choose(business: Business) {
    setSelected(business);
    try {
      const payload = await call(`/api/products?businessId=${business.id}`);
      setProducts(payload.products ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load products.');
    }
  }
  async function createBusiness(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = await call('/api/businesses', {
        method: 'POST',
        body: JSON.stringify({ name, slug, category }),
      });
      setBusinesses((current) => [payload.business, ...current]);
      setSelected(payload.business);
      setName('');
      setSlug('');
      setCategory('');
      setMessage('Business registered and awaiting verification.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to register business.');
    }
  }
  async function addProduct(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      const payload = await call('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          businessId: selected.id,
          name: productName,
          slug: productName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          price: Number(productPrice),
          currency: 'GBP',
          unit: 'each',
          stockQuantity: 0,
        }),
      });
      setProducts((current) => [...current, payload.product]);
      setProductName('');
      setProductPrice('');
      setMessage('Product saved as unavailable until stock is configured.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to add product.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="business-dashboard-shell">
      <header className="community-web-header">
        <a href="/" className="community-web-brand"><span className="brand-mark">✦</span>Community<span>Hub</span></a>
        <nav className="community-web-actions"><a href="/">Home</a><a href="/businesses">Directory</a><a href="/jobs">Jobs</a><a href="/login" className="web-sign-in">Account</a></nav>
      </header>
      <section className="dashboard-page">
      <header className="directory-header">
        <div>
          <p className="eyebrow">COMMUNITYHUB / BUSINESS</p>
          <h1>Business dashboard</h1>
          <p className="muted">
            Manage accurate listings and delivery settings. Checkout is not active.
          </p>
        </div>
        <a href="/businesses">View directory</a>
      </header>
      <section className="dashboard-columns">
        <aside className="dashboard-panel">
          <h2>Your businesses</h2>
          {businesses.map((business) => (
            <button
              className={
                selected?.id === business.id ? 'business-select selected' : 'business-select'
              }
              key={business.id}
              onClick={() => void choose(business)}
            >
              <strong>{business.name}</strong>
              <small>
                {business.verification_status} · {business.is_published ? 'published' : 'draft'}
              </small>
            </button>
          ))}
          {!businesses.length && <p className="muted">No businesses yet.</p>}
          <h3>Register business</h3>
          <form onSubmit={createBusiness} className="stack-form">
            <input
              required
              placeholder="Business name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              required
              placeholder="unique-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
            />
            <input
              required
              placeholder="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
            <button className="primary-action">Register</button>
          </form>
        </aside>
        <section className="dashboard-panel">
          {selected ? (
            <>
              <div className="dashboard-panel-heading">
                <div>
                  <h2>{selected.name}</h2>
                  <p className="muted">
                    {selected.verification_status === 'verified'
                      ? 'Verified'
                      : 'Awaiting platform verification'}
                  </p>
                </div>
                <a href={`/businesses/${selected.id}`}>Public page →</a>
              </div>
              <h3>Products</h3>
              {products.map((product) => (
                <div className="product-row" key={product.id}>
                  <span>
                    <strong>{product.name}</strong>
                    <small>
                      {product.currency} {product.price.toFixed(2)} / {product.unit}
                    </small>
                  </span>
                  <span>
                    {product.availability ? 'Available' : 'Unavailable'} · {product.stock_quantity}{' '}
                    in stock
                  </span>
                </div>
              ))}
              <form onSubmit={addProduct} className="inline-form">
                <input
                  required
                  placeholder="Product name"
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                />
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={productPrice}
                  onChange={(event) => setProductPrice(event.target.value)}
                />
                <button className="primary-action">Add product</button>
              </form>
              <div className="delivery-note">
                <strong>Delivery configuration</strong>
                <p>
                  Use the delivery API to configure postcodes, charges, minimum order values, time
                  slots, collection, and estimates. No checkout actions are exposed in Phase 4.
                </p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>Select or register a business</strong>
              <p>Only verified businesses are visible in the public directory.</p>
            </div>
          )}
        </section>
      </section>
      {message && <p className="status">{message}</p>}
      </section>
    </main>
  );
}
