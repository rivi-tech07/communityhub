import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  isPromotionActive,
  isSupportedCheckoutCurrency,
  verifyRazorpaySignature,
  verifyStripeSignature,
} from '../apps/web/lib/payments';

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
});
describe('CommunityHub payment safety helpers', () => {
  it('accepts only fresh valid provider signatures', () => {
    const payload = JSON.stringify({ id: 'evt_test' });
    const stripeSecret = 'stripe-test-secret';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', stripeSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    expect(verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, stripeSecret)).toBe(
      true,
    );
    expect(
      verifyStripeSignature(payload, `t=${timestamp - 301},v1=${signature}`, stripeSecret),
    ).toBe(false);
    const razorSecret = 'razor-test-secret';
    const razorSignature = createHmac('sha256', razorSecret).update(payload).digest('hex');
    expect(verifyRazorpaySignature(payload, razorSignature, razorSecret)).toBe(true);
    expect(verifyRazorpaySignature(payload, 'bad', razorSecret)).toBe(false);
  });
  it('does not treat pending or expired promotions as active', () => {
    const base = {
      approval_status: 'approved',
      starts_at: '2026-01-01T00:00:00Z',
      expires_at: '2026-02-01T00:00:00Z',
    };
    expect(
      isPromotionActive({ ...base, entitlement_status: 'active' }, new Date('2026-01-15')),
    ).toBe(true);
    expect(
      isPromotionActive({ ...base, entitlement_status: 'active' }, new Date('2026-02-01')),
    ).toBe(false);
    expect(
      isPromotionActive({ ...base, entitlement_status: 'pending_payment' }, new Date('2026-01-15')),
    ).toBe(false);
  });
  it('limits supported checkout currencies', () => {
    expect(isSupportedCheckoutCurrency('GBP')).toBe(true);
    expect(isSupportedCheckoutCurrency('INR')).toBe(true);
    expect(isSupportedCheckoutCurrency('USD')).toBe(false);
  });
});
