import { describe, expect, it } from 'vitest';
import {
  markPaymentEventFailure,
  shouldProcessPaymentEvent,
  type PaymentEventRecord,
} from '../apps/web/lib/payment-webhook-state';
import { verifyStripeSignature } from '../apps/web/lib/payments';
import { createHmac } from 'node:crypto';

describe('payment webhook hardening', () => {
  it('treats a processed duplicate as a no-op', () => {
    const processed: PaymentEventRecord = { status: 'processed', attempts: 1, lastError: null };
    expect(shouldProcessPaymentEvent(processed)).toBe(false);
    expect(shouldProcessPaymentEvent(undefined)).toBe(true);
  });

  it('rejects a stale signed timestamp', () => {
    const payload = JSON.stringify({ id: 'evt_stale' });
    const secret = 'stripe-test-secret';
    const timestamp = Math.floor(Date.now() / 1000) - 301;
    const digest = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
    expect(verifyStripeSignature(payload, `t=${timestamp},v1=${digest}`, secret)).toBe(false);
  });

  it('does not write for a bad signature', () => {
    const payload = JSON.stringify({ id: 'evt_bad' });
    expect(verifyStripeSignature(payload, 't=not-a-timestamp,v1=bad', 'secret')).toBe(false);
  });

  it('increments attempts and keeps a failed event unprocessed', () => {
    const failed = markPaymentEventFailure(
      { status: 'received', attempts: 1, lastError: null },
      new Error('database unavailable'),
    );
    expect(failed).toEqual({
      status: 'failed',
      attempts: 2,
      lastError: 'database unavailable',
    });
    expect(shouldProcessPaymentEvent(failed)).toBe(true);
  });
});
