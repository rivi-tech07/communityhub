import { describe, expect, it, vi } from 'vitest';
import { createFeatureFlagResolver, resolveFeatureFlag } from '@communityhub/shared';
import { disabledFeaturePayload } from '../apps/web/lib/feature-flags';

vi.mock('../apps/web/lib/feature-flags', async () => {
  const actual = await vi.importActual<typeof import('../apps/web/lib/feature-flags')>(
    '../apps/web/lib/feature-flags',
  );
  return { ...actual, requireFeature: vi.fn() };
});

describe('feature flags', () => {
  it('defaults new dormant features off with a stable disabled response', () => {
    expect(resolveFeatureFlag('checkout', { environment: 'production' })).toBe(false);
    expect(resolveFeatureFlag('promotions', { environment: 'production' })).toBe(false);
    expect(resolveFeatureFlag('service_enquiries', { environment: 'production' })).toBe(false);
    expect(disabledFeaturePayload('checkout')).toEqual({
      error: { code: 'FEATURE_DISABLED', message: 'This feature is not available yet.' },
      feature: 'checkout',
    });
  });

  it('uses environment overrides before database overrides and caches per resolver', async () => {
    let loads = 0;
    const resolver = createFeatureFlagResolver({
      environment: 'production',
      env: { FEATURE_CHECKOUT: 'true' },
      loadDbOverride: async () => {
        loads += 1;
        return false;
      },
    });

    expect(await resolver.isEnabled('checkout')).toBe(true);
    expect(await resolver.isEnabled('checkout')).toBe(true);
    expect(loads).toBe(1);
  });

  it('restores a dormant entry point when the flag is enabled', () => {
    expect(resolveFeatureFlag('checkout', { environment: 'production', dbOverride: true })).toBe(
      true,
    );
  });

  it('hides the checkout entry point when off and restores it when on', async () => {
    const { requireFeature } = await import('../apps/web/lib/feature-flags');
    const checkoutPage = (await import('../apps/web/app/checkout/page')).default;
    const disabledResponse = { status: 501 } as never;

    vi.mocked(requireFeature).mockResolvedValueOnce(disabledResponse);
    expect(await checkoutPage()).toBeNull();

    vi.mocked(requireFeature).mockResolvedValueOnce(null);
    expect(await checkoutPage()).toBeTruthy();
  });
});
