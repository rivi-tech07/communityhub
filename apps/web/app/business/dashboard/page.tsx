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
  image_url?: string | null;
};
type CatalogProduct = { id: string; name: string; category: string; default_unit: string };
type BusinessReport = {
  todaySales: number;
  completedOrders: number;
  totalOrders: number;
  products: Product[];
  recentOrders: Array<{ id: string; total: number; status: string; created_at: string }>;
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
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('1');
  const [catalogProductId, setCatalogProductId] = useState('');
  const [productPhoto, setProductPhoto] = useState<File | null>(null);
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
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
      const reportPayload = await call(`/api/businesses/${business.id}/reports`);
      setReport(reportPayload.report ?? null);
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
      const selectedCatalog = catalog.find((item) => item.id === catalogProductId);
      const productLabel = productName.trim() || selectedCatalog?.name;
      if (!productLabel) throw new Error('Choose a common product or enter a custom product name.');
      const payload = await call('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          businessId: selected.id,
          name: productLabel,
          slug: productLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          price: Number(productPrice),
          currency: 'GBP',
          unit: 'each',
          stockQuantity: Number(productStock),
          availability: Number(productStock) > 0,
          catalogProductId: catalogProductId || undefined,
        }),
      });
      if (productPhoto) {
        const session = await supabase?.auth.getSession();
        const token = session?.data.session?.access_token;
        const uploadResponse = await fetch(`/api/products/${payload.product.id}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ fileName: productPhoto.name, mimeType: productPhoto.type, sizeBytes: productPhoto.size }) });
        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadPayload.upload?.path || !uploadPayload.upload?.token || !supabase) throw new Error(uploadPayload.error ?? 'Unable to prepare product photo upload.');
        const { error: uploadError } = await supabase.storage.from('business-media').uploadToSignedUrl(uploadPayload.upload.path, uploadPayload.upload.token, productPhoto);
        if (uploadError) throw uploadError;
      }
      await choose(selected);
      setProductName('');
      setProductPrice('');
      setProductStock('1');
      setCatalogProductId('');
      setProductPhoto(null);
      setMessage('Product saved. It will appear publicly when the business is verified and published.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to add product.');
    }
  }
  async function updateStock(product: Product) {
    try {
      const stock = Number(stockDraft[product.id] ?? product.stock_quantity);
      if (!Number.isFinite(stock) || stock < 0) throw new Error('Stock must be zero or more.');
      await call(`/api/products/${product.id}`, { method: 'PATCH', body: JSON.stringify({ stock_quantity: stock, availability: stock > 0 }) });
      await choose(selected!);
      setMessage(`${product.name} stock updated.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update stock.'); }
  }
  useEffect(() => {
    void load();
    void fetch('/api/product-catalog', { cache: 'no-store' }).then((response) => response.json()).then((payload) => setCatalog(payload.products ?? []));
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
              {report && (
                <section className="business-report" aria-label="Shop reports">
                  <div className="business-report-heading">
                    <div><h3>Shop report</h3><p className="muted">Only data from {selected.name}</p></div>
                    <span className="report-period">Current totals</span>
                  </div>
                  <div className="business-report-metrics">
                    <div><small>Sales</small><strong>GBP {report.todaySales.toFixed(2)}</strong></div>
                    <div><small>Completed orders</small><strong>{report.completedOrders}</strong></div>
                    <div><small>Products</small><strong>{report.products.length}</strong></div>
                    <div><small>Low stock</small><strong>{report.products.filter((product) => product.stock_quantity <= 5).length}</strong></div>
                  </div>
                  <div className="business-report-stock">
                    <strong>Stock to manage</strong>
                    {report.products.slice(0, 6).map((product) => (
                      <div key={product.id}><span>{product.name}</span><span className={product.stock_quantity <= 5 ? 'low-stock' : ''}>{product.stock_quantity} in stock</span></div>
                    ))}
                  </div>
                </section>
              )}
              <h3>Products</h3>
              {products.map((product) => (
                <div className="product-row" key={product.id}>
                  {product.image_url && <img className="product-row-image" src={product.image_url} alt="" />}
                  <span>
                    <strong>{product.name}</strong>
                    <small>
                      {product.currency} {product.price.toFixed(2)} / {product.unit}
                    </small>
                  </span>
                  <span className="product-row-stock">
                    {product.availability ? 'Available' : 'Unavailable'} · {product.stock_quantity}{' '}
                    in stock
                    <input aria-label={`Stock for ${product.name}`} type="number" min="0" step="1" value={stockDraft[product.id] ?? product.stock_quantity} onChange={(event) => setStockDraft((current) => ({ ...current, [product.id]: event.target.value }))} />
                    <button type="button" className="secondary-action" onClick={() => void updateStock(product)}>Update stock</button>
                  </span>
                </div>
              ))}
              <form onSubmit={addProduct} className="inline-form">
                <select value={catalogProductId} onChange={(event) => { setCatalogProductId(event.target.value); const item = catalog.find((entry) => entry.id === event.target.value); if (item) { setProductName(item.name); } }}>
                  <option value="">Choose common product</option>
                  {catalog.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}
                </select>
                <input
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
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Stock quantity"
                  value={productStock}
                  onChange={(event) => setProductStock(event.target.value)}
                />
                <label className="file-action">Product photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProductPhoto(event.target.files?.[0] ?? null)} /></label>
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
