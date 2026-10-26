import { describe, expect, it } from 'vitest';
import { RETRY_DELAYS_SECONDS } from '../scripts/outbox-policy.mjs';

describe('Task 11 outbox backoff contract', () => {
  it('uses the documented retry schedule', () => {
    expect(RETRY_DELAYS_SECONDS).toEqual([60, 300, 900, 3600, 21600]);
  });

  it('caps retries at five attempts', () => {
    expect(RETRY_DELAYS_SECONDS).toHaveLength(5);
  });
});
