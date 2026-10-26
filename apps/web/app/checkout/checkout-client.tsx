'use client';

import { useState } from 'react';

export default function CheckoutClient() {
  const [purpose, setPurpose] = useState<'physical_order' | 'service_request' | 'promotion'>(
    'physical_order',
  );
  const [referenceId, setReferenceId] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('Creating a secure test-mode payment…');
    const response = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose, referenceId, idempotencyKey: crypto.randomUUID() }),
    });
    const body = await response.json();
    setMessage(
      response.ok
        ? 'Payment created. Complete it with the configured provider client.'
        : (body.error?.message ?? body.error ?? 'Payment could not be created.'),
    );
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">COMMUNITYHUB / CHECKOUT</p>
        <h1>Secure checkout</h1>
        <p className="muted">
          Checkout is server-created and provider-confirmed. No card details are collected by this
          page.
        </p>
        <form onSubmit={submit}>
          <label>Purchase type</label>
          <select
            value={purpose}
            onChange={(event) => setPurpose(event.target.value as typeof purpose)}
          >
            <option value="physical_order">Physical order</option>
            <option value="service_request">Service request</option>
            <option value="promotion">Paid promotion</option>
          </select>
          <label>Order or promotion ID</label>
          <input
            required
            value={referenceId}
            onChange={(event) => setReferenceId(event.target.value)}
            placeholder="UUID"
          />
          <button className="primary-action" type="submit">
            Create test payment
          </button>
        </form>
        <p className="status">{message}</p>
        <p className="muted">
          Live payments remain disabled until provider approval, webhooks, refunds, and compliance
          checks are complete.
        </p>
      </section>
    </main>
  );
}
