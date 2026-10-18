'use client';

import { useEffect, useState } from 'react';
type Business = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};
type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  unit: string;
  stock_quantity: number;
  discount_percentage: number;
};
export default function BusinessPage({ params }: { params: Promise<{ businessId: string }> }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState('Loading business…');
  useEffect(() => {
    void params.then(async ({ businessId }) => {
      const [businessResponse, productResponse] = await Promise.all([
        fetch(`/api/businesses/${businessId}`),
        fetch(`/api/products?businessId=${businessId}`),
      ]);
      const businessPayload = await businessResponse.json();
      const productPayload = await productResponse.json();
      if (!businessResponse.ok) {
        setMessage(businessPayload.error ?? 'Business not found.');
        return;
      }
      setBusiness(businessPayload.business);
      setProducts(productPayload.products ?? []);
      setMessage('');
    });
  }, [params]);
  if (!business)
    return (
      <main className="directory-page">
        <p className="muted">{message}</p>
      </main>
    );
  return (
    <main className="directory-page">
      <a className="back-link" href="/businesses">
        ← All businesses
      </a>
      <header className="business-detail-header">
        <div>
          <span className="business-category">{business.category}</span>
          <h1>{business.name}</h1>
          <p className="muted">{business.description}</p>
          <small>{business.city ?? business.country ?? 'Local'}</small>
        </div>
        <div className="contact-card">
          <strong>Contact preferences</strong>
          <p>
            {business.contact_email
              ? `Email: ${business.contact_email}`
              : 'Contact details are not published.'}
          </p>
          {business.contact_phone && <p>Phone available</p>}
        </div>
      </header>
      <h2 className="catalog-heading">Published catalog</h2>
      <section className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            <span className="product-unit">{product.unit}</span>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <strong>
              {product.currency} {product.price.toFixed(2)}
            </strong>
            {product.discount_percentage > 0 && (
              <small>{product.discount_percentage}% discount</small>
            )}
            <span className={product.stock_quantity > 0 ? 'available' : 'unavailable'}>
              {product.stock_quantity > 0 ? 'Available' : 'Out of stock'}
            </span>
          </article>
        ))}
      </section>
      {!products.length && (
        <div className="empty-state">
          <strong>No published products yet</strong>
          <p>This business is preparing its catalog.</p>
        </div>
      )}
      <p className="checkout-note">
        Checkout is not active in Phase 4. This catalog is for discovery and delivery configuration
        only.
      </p>
    </main>
  );
}
